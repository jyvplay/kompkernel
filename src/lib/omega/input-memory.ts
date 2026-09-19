/**
 * Input-memory relative codec (IM1)
 * ---------------------------------------------------------------------------
 * Safe input-only cross-turn compression: future user/input text may refer to
 * exact byte ranges of prior *input* turns that the application already stores.
 * This module deliberately does not learn from model outputs. It is a pure
 * gateway/storage primitive; callers decide whether an LLM is allowed to see
 * IM1 references directly or whether the gateway expands them before sending.
 */

import { countTokens, type EncodingName } from './bpe';

export interface InputMemorySource {
  id: string;
  text: string;
}

export interface InputMemoryReference {
  source: number;
  offset: number;
  length: number;
}

export interface InputMemoryResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  references: InputMemoryReference[];
  mode: 'im1' | 'identity';
}

const REF_OPEN = '↩';
const REF_CLOSE = '↪';
const DEFAULT_SEED_CHARS = 16;
const DEFAULT_MIN_REF_CHARS = 48;
const MAX_CANDIDATES_PER_SEED = 128;
const MAX_SOURCES = 64;

type Pos = { source: number; offset: number };

function buildSeedIndex(sources: InputMemorySource[], seedChars: number): Map<string, Pos[]> {
  const index = new Map<string, Pos[]>();
  for (let s = 0; s < Math.min(sources.length, MAX_SOURCES); s++) {
    const text = sources[s].text;
    for (let i = 0; i + seedChars <= text.length; i++) {
      const seed = text.slice(i, i + seedChars);
      const bucket = index.get(seed);
      if (bucket === undefined) index.set(seed, [{ source: s, offset: i }]);
      else if (bucket.length < MAX_CANDIDATES_PER_SEED) bucket.push({ source: s, offset: i });
    }
  }
  return index;
}

function extendMatch(needle: string, i: number, haystack: string, j: number): number {
  let n = 0;
  while (i + n < needle.length && j + n < haystack.length && needle.charCodeAt(i + n) === haystack.charCodeAt(j + n)) n++;
  return n;
}

function refWire(ref: InputMemoryReference): string {
  return `${REF_OPEN}${ref.source}:${ref.offset}:${ref.length}${REF_CLOSE}`;
}

/**
 * Encode `text` against prior input turns. Returns identity unless the compact
 * references reduce tokenizer cost and decode byte-exactly.
 */
export function encodeInputMemory(
  text: string,
  priorInputs: InputMemorySource[],
  enc: EncodingName,
  opts: { seedChars?: number; minRefChars?: number } = {},
): InputMemoryResult {
  const inTokens = countTokens(text, enc);
  const identity: InputMemoryResult = {
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    references: [],
    mode: 'identity',
  };
  if (priorInputs.length === 0) return identity;
  // Avoid escaping complexity in the prompt-visible representation. This is a
  // conservative no-op, not a failure.
  if (text.includes(REF_OPEN) || text.includes(REF_CLOSE)) return identity;

  const seedChars = Math.max(4, opts.seedChars ?? DEFAULT_SEED_CHARS);
  const minRefChars = Math.max(seedChars, opts.minRefChars ?? DEFAULT_MIN_REF_CHARS);
  if (text.length < minRefChars) return identity;

  const sources = priorInputs.slice(0, MAX_SOURCES);
  const index = buildSeedIndex(sources, seedChars);
  let i = 0;
  let wire = '';
  const references: InputMemoryReference[] = [];

  while (i < text.length) {
    let best: InputMemoryReference | null = null;
    if (i + seedChars <= text.length) {
      const seed = text.slice(i, i + seedChars);
      const bucket = index.get(seed) ?? [];
      for (const pos of bucket) {
        const src = sources[pos.source].text;
        const len = extendMatch(text, i, src, pos.offset);
        if (len < minRefChars) continue;
        const cand = { source: pos.source, offset: pos.offset, length: len };
        if (best === null || cand.length > best.length) best = cand;
      }
    }

    if (best !== null) {
      const rWire = refWire(best);
      const literal = text.slice(i, i + best.length);
      // Token profitability is checked locally and again for the full wire.
      if (countTokens(rWire, enc) < countTokens(literal, enc)) {
        wire += rWire;
        references.push(best);
        i += best.length;
        continue;
      }
    }
    wire += text[i];
    i++;
  }

  const decoded = decodeInputMemory(wire, sources);
  const exact = decoded === text;
  const outTokens = countTokens(wire, enc);
  if (!exact || outTokens >= inTokens) return identity;
  return {
    wire,
    decoded,
    exact,
    inTokens,
    outTokens,
    savingsPct: inTokens > 0 ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    references,
    mode: 'im1',
  };
}

/** Decode IM1 references using the same prior input array. */
export function decodeInputMemory(wire: string, priorInputs: InputMemorySource[]): string {
  let out = '';
  let last = 0;
  const re = /↩(\d+):(\d+):(\d+)↪/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(wire)) !== null) {
    out += wire.slice(last, m.index);
    const source = Number(m[1]);
    const offset = Number(m[2]);
    const length = Number(m[3]);
    const src = priorInputs[source]?.text;
    if (!Number.isSafeInteger(source) || !Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || src === undefined || offset < 0 || length < 0 || offset + length > src.length) {
      // Malformed or unavailable reference: leave the wire uninterpreted rather
      // than guessing. Valid encoder output always avoids this branch.
      return wire;
    }
    out += src.slice(offset, offset + length);
    last = re.lastIndex;
  }
  out += wire.slice(last);
  return out;
}

export function inputMemorySelfTest(enc: EncodingName = 'o200k_base'): Array<{ name: string; pass: boolean; detail: string }> {
  const base = [
    'Final report: migration finished for 3 services. I verified each step twice; no issues found in the first two, the third needs retries.',
    '- gateway: 14 routes checked, no issues found',
    '- auth: token rotation verified, no issues found',
    'svc,region,status,notes',
    'gateway,us-east-1,ok,no issues found',
    'auth,eu-west-1,ok,rotated',
    '{"svc":"gateway","status":"ok","checks":14,"ms":812}',
    'def check(svc):',
    '    if svc.status == "ok": return "no issues found"',
    '    return "retry scheduled"',
    '备注：网关和认证迁移已完成，搜索服务还有两个分片待处理。',
  ].join('\n');
  const next = base.replace('3 services', '4 services') + '\nSummary: same rubric, new count.';
  const prior = [{ id: 'u0', text: base }];
  const r = encodeInputMemory(next, prior, enc, { minRefChars: 32 });
  const decoded = decodeInputMemory(r.wire, prior);
  const noPrior = encodeInputMemory(next, [], enc);
  const markerNoop = encodeInputMemory('literal ↩ marker', prior, enc);
  return [
    { name: 'IM1 exact relative decode', pass: decoded === next && r.exact, detail: `${r.inTokens}→${r.outTokens} refs=${r.references.length}` },
    { name: 'IM1 only fires with prior inputs', pass: noPrior.mode === 'identity' && noPrior.wire === next, detail: noPrior.mode },
    { name: 'IM1 sentinel collision no-op', pass: markerNoop.mode === 'identity' && markerNoop.wire === 'literal ↩ marker', detail: markerNoop.mode },
  ];
}
