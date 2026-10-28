/**
 * BIFRONT — X46 candidate: bidirectional path-boundary factoring.
 *
 * Mechanism: on a homogeneous list whose every non-empty row ends in a path,
 * find the longest suffix shared by all path fields, remove it from each field,
 * and state that suffix once in the in-band contract. Unlike DENDRON / ELLEIPSIS,
 * which factor a common path prefix or path-tree branch, BIFRONT factors the
 * *right-hand boundary* of every row. The candidate is composed over SYNKRISIS
 * and is accepted only if the complete contract + wire is byte-exact and
 * strictly cheaper than SYNKRISIS on the original input. Otherwise the exact
 * SYNKRISIS message is returned unchanged.
 *
 * This file deliberately makes no claim that the candidate wins on any lane.
 * Its first measured `find-listing` probe was exact but lost to the parent.
 */

import { countTokens, type EncodingName } from './bpe';
import { synkrisisEncode, type SynkrisisResult } from './synkrisis';

export const BIFRONT_MAX_CHARS = 50_000;
export const BIFRONT_MAX_LINES = 2_000;
export const BIFRONT_MIN_PATHS = 4;
export const BIFRONT_MAX_SUFFIX_CODEPOINTS = 64;

export interface BifrontPlan {
  suffix: string;
  pathCount: number;
  transformed: string;
}

export interface BifrontResult {
  wire: string;
  contract: string;
  message: string;
  decoded: string;
  messageTokens: number;
  parentTokens: number;
  inTokens: number;
  applied: boolean;
  suffix: string | null;
  pathCount: number;
  parentArm: string;
  notes: string;
  ms: number;
}

/**
 * Preserve each exact line terminator while mapping only line bodies.
 * Splitting with a captured delimiter also preserves a terminal line break.
 */
function mapLineBodies(text: string, map: (line: string) => string): string {
  const parts = text.split(/(\r\n|\n|\r)/);
  for (let i = 0; i < parts.length; i += 2) parts[i] = map(parts[i]);
  return parts.join('');
}

interface PathField {
  prefix: string;
  path: string;
  trailing: string;
}

/** Split a final non-space field while preserving the exact preceding text. */
function finalPathField(line: string): PathField | null {
  const m = line.match(/^(.*?)(\S+)([ \t]*)$/);
  if (!m) return null;
  const prefix = m[1];
  const path = m[2];
  if (!path.includes('/') && !path.includes('\\')) return null;
  // A multi-field row must have a separator before its path. A single-field
  // path is permitted; both forms are unambiguous in the wire.
  if (prefix && !/[ \t]$/.test(prefix)) return null;
  return { prefix, path, trailing: m[3] };
}

function longestCommonSuffix(paths: string[]): string {
  if (!paths.length) return '';
  const first = Array.from(paths[0]);
  let common = first.length;
  for (let i = 1; i < paths.length && common; i++) {
    const current = Array.from(paths[i]);
    let matched = 0;
    const limit = Math.min(common, current.length);
    while (matched < limit
      && first[first.length - 1 - matched] === current[current.length - 1 - matched]) {
      matched++;
    }
    common = matched;
  }
  return first.slice(first.length - common).join('');
}

/**
 * Find a safe, reversible right-boundary factor. The accepted source class is
 * deliberately narrow: every non-empty line must end in a path field, there
 * must be at least four paths, and every path must have a non-empty residual
 * after removing a shared suffix of at least two Unicode code points.
 */
export function bifrontPlan(text: string): BifrontPlan | null {
  if (!text.length || text.length > BIFRONT_MAX_CHARS) return null;
  const parts = text.split(/(\r\n|\n|\r)/);
  const lines = parts.filter((_, i) => i % 2 === 0);
  if (lines.length > BIFRONT_MAX_LINES) return null;

  const paths: string[] = [];
  for (const line of lines) {
    if (line === '') continue;
    const field = finalPathField(line);
    if (!field) return null;
    paths.push(field.path);
  }
  if (paths.length < BIFRONT_MIN_PATHS) return null;

  const suffix = longestCommonSuffix(paths);
  const suffixChars = Array.from(suffix);
  if (suffixChars.length < 2 || suffixChars.length > BIFRONT_MAX_SUFFIX_CODEPOINTS) return null;
  if (paths.some(path => path.length <= suffix.length)) return null;

  const transformed = mapLineBodies(text, line => {
    if (line === '') return line;
    const field = finalPathField(line);
    if (!field || !field.path.endsWith(suffix)) return line; // guarded above
    return field.prefix + field.path.slice(0, -suffix.length) + field.trailing;
  });

  // Local inverse is the authority for the transform, not the shape checks.
  if (bifrontRestore(transformed, suffix) !== text) return null;
  return { suffix, pathCount: paths.length, transformed };
}

/** Restore a suffix on every final path field. Malformed input fails closed. */
export function bifrontRestore(wire: string, suffix: string): string {
  if (!suffix || suffix.includes('\n') || suffix.includes('\r')) return wire;
  let valid = true;
  const restored = mapLineBodies(wire, line => {
    if (line === '') return line;
    const field = finalPathField(line);
    if (!field) { valid = false; return line; }
    return field.prefix + field.path + suffix + field.trailing;
  });
  return valid ? restored : wire;
}

function afterParentContract(parentContract: string, suffix: string): string {
  const rule = `After decoding the parent, append ${JSON.stringify(suffix)} to every final path field.`;
  const base = parentContract.trim().replace(/\s*(?:;\s*)?print only\.$/i, '').trim();
  return base ? `${base} ${rule} Print only.` : `${rule} Print only.`;
}

function parentMessage(parent: SynkrisisResult): string {
  return parent.message || (parent.contract ? `${parent.contract}\n${parent.wire}` : parent.wire);
}

/**
 * Encode with a one-call fallback floor and one transformed candidate. The
 * entire emitted message is re-counted under the requested encoding; the
 * candidate is never accepted on a body-only or proxy estimate.
 */
export function bifrontEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
): BifrontResult {
  const t0 = Date.now();
  let parent: SynkrisisResult;
  try {
    parent = synkrisisEncode(text, enc);
  } catch {
    const inTokens = countTokens(text, enc);
    return {
      wire: text, contract: '', message: text, decoded: text,
      messageTokens: inTokens, parentTokens: inTokens, inTokens,
      applied: false, suffix: null, pathCount: 0, parentArm: 'raw-fallback',
      notes: 'SYNKRISIS parent failed; raw identity fallback', ms: Date.now() - t0,
    };
  }

  const baseMessage = parentMessage(parent);
  const baseTokens = countTokens(baseMessage, enc);
  const fallback: BifrontResult = {
    wire: parent.wire,
    contract: parent.contract,
    message: baseMessage,
    decoded: parent.decoded,
    messageTokens: baseTokens,
    parentTokens: baseTokens,
    inTokens: countTokens(text, enc),
    applied: false,
    suffix: null,
    pathCount: 0,
    parentArm: parent.arm,
    notes: `identity (SYNKRISIS parent M=${baseTokens})`,
    ms: Date.now() - t0,
  };

  // The inherited parent result is not trusted as a candidate unless its own
  // exact decoded field agrees with the source.
  if (parent.decoded !== text) {
    const rawTokens = countTokens(text, enc);
    return {
      ...fallback, wire: text, contract: '', message: text, decoded: text,
      messageTokens: rawTokens, parentTokens: rawTokens,
      notes: 'SYNKRISIS failed its exactness field; raw identity fallback',
      ms: Date.now() - t0,
    };
  }

  const plan = bifrontPlan(text);
  if (!plan) return { ...fallback, ms: Date.now() - t0 };

  let candidate: SynkrisisResult;
  try {
    candidate = synkrisisEncode(plan.transformed, enc);
  } catch {
    return { ...fallback, suffix: plan.suffix, pathCount: plan.pathCount,
      notes: 'candidate parent encode failed; SYNKRISIS fallback', ms: Date.now() - t0 };
  }
  if (candidate.decoded !== plan.transformed || bifrontRestore(candidate.decoded, plan.suffix) !== text) {
    return { ...fallback, suffix: plan.suffix, pathCount: plan.pathCount,
      notes: 'candidate round-trip failed; SYNKRISIS fallback', ms: Date.now() - t0 };
  }

  const contract = afterParentContract(candidate.contract, plan.suffix);
  const message = `${contract}\n${candidate.wire}`;
  const messageTokens = countTokens(message, enc);
  if (messageTokens >= baseTokens) {
    return {
      ...fallback,
      suffix: plan.suffix,
      pathCount: plan.pathCount,
      notes: `exact suffix fold refused: candidate M=${messageTokens} >= SYNKRISIS M=${baseTokens}`,
      ms: Date.now() - t0,
    };
  }

  return {
    wire: candidate.wire,
    contract,
    message,
    decoded: text,
    messageTokens,
    parentTokens: baseTokens,
    inTokens: fallback.inTokens,
    applied: true,
    suffix: plan.suffix,
    pathCount: plan.pathCount,
    parentArm: candidate.arm,
    notes: `sharedSuffix=${JSON.stringify(plan.suffix)} paths=${plan.pathCount}; `
      + `M=${messageTokens} < SYNKRISIS M=${baseTokens}`,
    ms: Date.now() - t0,
  };
}

/** Small local correctness and negative-space suite. */
export function bifrontSelfTests() {
  const checks: { name: string; pass: boolean; detail: string }[] = [];
  const run = (name: string, input: string, expectedApplied: boolean) => {
    try {
      const p = bifrontPlan(input);
      const back = p ? bifrontRestore(p.transformed, p.suffix) : input;
      const pass = back === input && Boolean(p) === expectedApplied;
      checks.push({ name, pass, detail: `plan=${Boolean(p)} exact=${back === input} suffix=${p?.suffix ?? '-'}` });
    } catch (e) {
      checks.push({ name, pass: false, detail: String(e) });
    }
  };
  run('homogeneous shared extension', 't 1 src/a.ts\nt 2 src/b.ts\nt 3 src/c.ts\nt 4 src/d.ts', true);
  run('mixed terminal extensions', 't 1 src/a.ts\nt 2 src/b.js\nt 3 src/c.ts\nt 4 src/d.ts', false);
  run('only three path rows', 't 1 src/a.ts\nt 2 src/b.ts\nt 3 src/c.ts', false);
  run('short common suffix', 't 1 dir/aa\nt 2 dir/ba\nt 3 dir/ca\nt 4 dir/da', false);
  run('ordinary prose', 'A path-like thought is not a table of paths.', false);
  run('trailing LF survives', 't 1 src/a.ts\nt 2 src/b.ts\nt 3 src/c.ts\nt 4 src/d.ts\n', true);
  run('CRLF survives', 't 1 src/a.ts\r\nt 2 src/b.ts\r\nt 3 src/c.ts\r\nt 4 src/d.ts\r\n', true);
  run('trailing spaces survive', 't 1 src/a.ts  \nt 2 src/b.ts  \nt 3 src/c.ts  \nt 4 src/d.ts  ', true);
  return checks;
}
