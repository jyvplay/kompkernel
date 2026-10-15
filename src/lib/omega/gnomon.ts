/**
 * src/lib/omega/gnomon.ts
 * =============================================================================
 * GNOMON — the part that, added to what is given, completes the whole.
 * (exact, byte-perfect, single-chat-readable, no system prompt; identity unless it pays)
 *
 * THE GAP (measured this turn; bench/z54)
 * -----------------------------------------------------------------------------
 * Every DAEDALUS wire pays one token per position whose content is not a copy of
 * earlier text (bench/z46 position bound). Two everyday JSON formats carry values
 * that are NOT copies, yet are fixed by a public convention given their siblings:
 *
 *   R1  REST link fields (GitHub API, most REST APIs). In one object, the `url`
 *       field names the resource and the `*_url` fields name its sub-resources:
 *       `comments_url` = url + "/comments". Measured on bench/holdout/gh-api.json.txt:
 *       13 fields are exactly  url + "/" + key stem  (zero payload), and 12 more
 *       extend an earlier link of the same object (prefix copy + remainder).
 *   R2  npm registry tarball URLs in package-lock.json. The `resolved` value of an
 *       entry is https://registry.npmjs.org/NAME/-/BASE-VERSION.tgz, with NAME the
 *       package path, BASE its last segment and VERSION the entry's version.
 *       Measured on bench/holdout-ops/package-lock-head.json: 62 of 62 fields.
 *
 * Both are the same mechanism class as ENTHYMEME (Z46) and EPAGOGE (Z47): the
 * field is removed and the reader is given the convention in one sentence. They are
 * NEW SCHEMAS: ENTHYMEME covers JVM frames and heading slugs, EPAGOGE covers
 * language-induced frames and changelog compare links; neither covers REST link
 * fields or registry tarball URLs (grep of src/lib/omega, this turn).
 *
 * BASES (added this turn)
 * -----------------------------------------------------------------------------
 * The rules run on either base, and the smallest exact message wins:
 *   daedalus  the rule-reduced text through DAEDALUS (the original arm), or
 *   gramma    the rule-reduced text through GRAMMA's JSON dialects (json1/2/4/tab),
 *             which removes the layout the rules do not touch.
 * Plain DAEDALUS and plain GRAMMA are always candidates, so the result is never above
 * the stack minimum of those two. Measured (bench/z54/gnomon-bench.ts, o200k, exact):
 *   package-lock-head.json  frontier 5463 (GRAMMA) -> 5127 (-336, npm rule, gramma base)
 *   gh-api.json.txt         frontier 1091 (GRAMMA) -> 1088 (-3, rest rule): a few tokens only.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   rest     the DAEDALUS wire of the reduced text (dictionary + glyph rules)
 *   prompt   DAEDALUS's own decoder contract, then one sentence per rule that is
 *            used. The reader: (1) expands the glyph rules as DAEDALUS says,
 *            (2) restores the rule-elided fields as the sentence says.
 *
 * FORMS (for a field whose key is K, inside JSON object O)
 *   R1 stem  `"K_url": "~"`        value = O.url + "/" + K            (K without "_url")
 *   R1 front `"K_url": "~k<x>"`    value = the k-th link value of O (0 = O.url,
 *                                   then earlier links in order) + x   (x does not start with a digit)
 *   R2       `"resolved": "~"`     value = https://registry.npmjs.org/NAME/-/BASE-VERSION.tgz
 *
 * GATE / GUARD (all must hold, else the rule is off)
 *   G1 the rule's own transform round-trips the input byte-exactly;
 *   G2 the composed wire decodes byte-exactly (DAEDALUS round trip);
 *   G3 the plain DAEDALUS arm is always computed; the smallest exact one wins,
 *      ties go to plain, so M is never above the frontier.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusResult } from './daedalus';
import { CHIRON_START } from './chiron';
import { grammaEncode, grammaDecode, type GrammaDialectId } from './gramma';

export const GNOMON_REST_SENTENCE =
  '~ in a "_url" value = the object url + "/" + the key without "_url"; ~k+x = link k of the object (0 = url, then earlier links in order) + x.';
export const GNOMON_NPM_SENTENCE =
  'Resolved ~ = https://registry.npmjs.org/NAME/-/BASE-VERSION.tgz, NAME = the package path after node_modules/, BASE = its last segment, VERSION = the entry version.';

export type GnomonRule = 'rest' | 'npm';

/* ---------------------------------------------------------------------------
 * R1 — REST link fields inside one JSON object.
 * Scope: a line ending in "{" opens an object, a line starting with "}" closes it.
 * Only lines of the exact shape `  "KEY": "VALUE",?` are touched.
 * ------------------------------------------------------------------------- */
const OPEN = /\{\s*$/;
const CLOSE = /^\s*\}/;
const LINK = /^(\s*"([A-Za-z_]*)url": ")([^"]*)(",?)$/;
const MIN_PREFIX = 12;

interface LinkScope { base?: string; list: string[] }

function restForward(text: string): { out: string; fields: number } {
  const scopes: LinkScope[] = [{ list: [] }];
  let fields = 0;
  const lines = text.split('\n').map(line => {
    let res = line;
    if (OPEN.test(line)) scopes.push({ list: [] });
    const m = LINK.exec(line);
    if (m && m[3].startsWith('https://')) {
      const sc = scopes[scopes.length - 1];
      const v = m[3];
      const key = m[2];
      if (key === '') {
        sc.base = v;
      } else if (sc.base !== undefined && sc.base + '/' + key.replace(/_$/, '') === v) {
        res = m[1] + '~' + m[4]; fields++;
      } else {
        let best = -1, bestLen = -1;
        sc.list.forEach((b, k) => {
          if (b.length >= MIN_PREFIX && b.length > bestLen && v.startsWith(b) && !/^[0-9]/.test(v.slice(b.length))) { best = k; bestLen = b.length; }
        });
        if (best >= 0 && bestLen < v.length) { res = m[1] + '~' + best + v.slice(bestLen) + m[4]; fields++; }
      }
      sc.list.push(v);
    }
    if (CLOSE.test(line) && scopes.length > 1) scopes.pop();
    return res;
  });
  return { out: lines.join('\n'), fields };
}

function restInverse(wire: string): string {
  const scopes: LinkScope[] = [{ list: [] }];
  return wire.split('\n').map(line => {
    let res = line;
    if (OPEN.test(line)) scopes.push({ list: [] });
    const sc = scopes[scopes.length - 1];
    const stem = /^(\s*"([A-Za-z_]*)url": ")~"(,?)$/.exec(line);
    const front = /^(\s*"[A-Za-z_]*url": ")~(\d+)([^"]*)(",?)$/.exec(line);
    const plain = LINK.exec(line);
    if (stem) {
      if (sc.base === undefined) throw new Error('gnomon: stem before url');
      const v = sc.base + '/' + stem[2].replace(/_$/, '');
      res = stem[1] + v + '"' + stem[3];
      sc.list.push(v);
    } else if (front) {
      const k = Number(front[2]);
      if (k >= sc.list.length) throw new Error('gnomon: bad link index');
      const v = sc.list[k] + front[3];
      res = front[1] + v + front[4];
      sc.list.push(v);
    } else if (plain && plain[3].startsWith('https://')) {
      if (plain[2] === '') sc.base = plain[3];
      sc.list.push(plain[3]);
    }
    if (CLOSE.test(line) && scopes.length > 1) scopes.pop();
    return res;
  }).join('\n');
}

/* ---------------------------------------------------------------------------
 * R2 — npm `resolved` tarball URLs. State: the current entry key and version.
 * ------------------------------------------------------------------------- */
const ENTRY = /^\s*"([^"]*)": \{\s*$/;
const VERSION = /^\s*"version": "([^"]*)",?\s*$/;
const RESOLVED = /^(\s*"resolved": ")([^"]*)(",?)$/;

function npmName(key: string): string {
  const i = key.lastIndexOf('node_modules/');
  return i >= 0 ? key.slice(i + 'node_modules/'.length) : key;
}
function npmUrl(name: string, version: string): string {
  const base = name.split('/').pop() ?? name;
  return `https://registry.npmjs.org/${name}/-/${base}-${version}.tgz`;
}

function npmForward(text: string): { out: string; fields: number } {
  let name: string | undefined, version: string | undefined;
  let fields = 0;
  const lines = text.split('\n').map(line => {
    const e = ENTRY.exec(line);
    if (e) { name = npmName(e[1]) || undefined; version = undefined; return line; }
    const v = VERSION.exec(line);
    if (v) { version = v[1]; return line; }
    const r = RESOLVED.exec(line);
    if (r && name !== undefined && version !== undefined && r[2] === npmUrl(name, version)) {
      fields++;
      return r[1] + '~' + r[3];
    }
    return line;
  });
  return { out: lines.join('\n'), fields };
}

function npmInverse(wire: string): string {
  let name: string | undefined, version: string | undefined;
  return wire.split('\n').map(line => {
    const e = ENTRY.exec(line);
    if (e) { name = npmName(e[1]) || undefined; version = undefined; return line; }
    const v = VERSION.exec(line);
    if (v) { version = v[1]; return line; }
    const r = /^(\s*"resolved": ")~(",?)$/.exec(line);
    if (r) {
      if (name === undefined || version === undefined) throw new Error('gnomon: resolved before entry/version');
      return r[1] + npmUrl(name, version) + r[2];
    }
    return line;
  }).join('\n');
}

/* ---------------------------------------------------------------------------
 * Composition and the guarded encoder.
 * ------------------------------------------------------------------------- */

export type GnomonBase = 'daedalus' | 'gramma';

export interface GnomonCandidate {
  rules: GnomonRule[];
  base: GnomonBase;
  reduced: string;
  wire: string;
  /** the reader's message without the rule sentences (DAEDALUS prompt, or GRAMMA prompt for base gramma) */
  innerPrompt: string;
  prompt: string;
  exact: boolean;
  M: number;
  fields: number;
}

export interface GnomonResult {
  codec: 'gnomon';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  frontierM: number;
  messageTokens: number;
  base: GnomonBase;
  rules: GnomonRule[];
  fields: Record<GnomonRule, number>;
  decoderPrompt: string;
  candidates: { rules: string; base: GnomonBase; M: number; exact: boolean }[];
  notes: string;
}

/** Admissible wires: a raw identity DAEDALUS wire that starts with the CHIRON start mark is ambiguous to the reader
 *  (it would look like a tape with a contract line), so GNOMON does not use it. */
export function gnomonWireOk(d: DaedalusResult): boolean {
  return !(d.mode === 'raw' && d.wire.startsWith(CHIRON_START));
}

/** The reader's message: the DAEDALUS wire, its contract line only when the wire has a CHIRON tape, then the sentences. */
export function daedalusInnerPrompt(wire: string): string {
  return wire.startsWith(CHIRON_START) ? daedalusDecoderPrompt(wire) : wire;
}

export function gnomonPrompt(wire: string, rules: GnomonRule[]): string {
  return gnomonCompose(daedalusInnerPrompt(wire), rules);
}

export function gnomonSentences(rules: GnomonRule[]): string {
  return rules.map(r => (r === 'rest' ? GNOMON_REST_SENTENCE : GNOMON_NPM_SENTENCE)).join('\n');
}

/** Apply the chosen rules in a fixed order (npm first, then rest: rest never touches `resolved`). */
export function gnomonReduce(text: string, rules: GnomonRule[]): { reduced: string; fields: Record<GnomonRule, number> } {
  let t = text;
  const fields: Record<GnomonRule, number> = { rest: 0, npm: 0 };
  if (rules.includes('npm')) { const r = npmForward(t); t = r.out; fields.npm = r.fields; }
  if (rules.includes('rest')) { const r = restForward(t); t = r.out; fields.rest = r.fields; }
  return { reduced: t, fields };
}

export function gnomonRestore(wire: string, rules: GnomonRule[]): string {
  let t = wire;
  if (rules.includes('rest')) t = restInverse(t);
  if (rules.includes('npm')) t = npmInverse(t);
  return t;
}

/** GRAMMA dialects that are JSON notations: the only ones the CPython reader implements (bench/gnomon_decode.py). */
export const GNOMON_GRAMMA_DIALECTS: GrammaDialectId[] = ['json1', 'json2', 'json4', 'jsontab'];

/** Reader-visible message for a base: DAEDALUS prompt rules, or the GRAMMA prompt (already self-describing) plus sentences. */
export function gnomonCompose(innerPrompt: string, rules: GnomonRule[]): string {
  return rules.length ? innerPrompt + '\n' + gnomonSentences(rules) : innerPrompt;
}

export function gnomonEncode(text: string, enc: EncodingName = 'o200k_base'): GnomonResult {
  const plainD: DaedalusResult = daedalusEncode(text, enc);
  const plainG = grammaEncode(text, enc); // the GRAMMA menu: the frontier candidate for JSON layout
  const frontierM = Math.min(plainD.messageTokens, plainG.messageTokens);
  const subsets: GnomonRule[][] = [['npm'], ['rest'], ['npm', 'rest']];
  const cands: GnomonCandidate[] = [
    { rules: [], base: 'daedalus', reduced: text, wire: plainD.wire, innerPrompt: plainD.decoderPrompt, prompt: plainD.decoderPrompt,
      exact: plainD.exact, M: plainD.messageTokens, fields: 0 },
    { rules: [], base: 'gramma', reduced: text, wire: plainG.wire, innerPrompt: plainG.decoderPrompt, prompt: plainG.decoderPrompt,
      exact: plainG.exact, M: plainG.messageTokens, fields: 0 },
  ];
  for (const rules of subsets) {
    const { reduced, fields } = gnomonReduce(text, rules);
    const total = fields.rest + fields.npm;
    if (total === 0 || reduced === text) continue;
    /* G1: each rule's own transform must invert exactly on the input. */
    if (gnomonRestore(reduced, rules) !== text) continue;
    /* G2a: DAEDALUS base, composed wire decodes exactly: DAEDALUS round trip, then restore. */
    const d: DaedalusResult = daedalusEncode(reduced, enc);
    if (gnomonWireOk(d) && d.exact && gnomonRestore(daedalusDecode(d.wire), rules) === text) {
      const inner = daedalusInnerPrompt(d.wire);
      const prompt = gnomonCompose(inner, rules);
      cands.push({ rules, base: 'daedalus', reduced, wire: d.wire, innerPrompt: inner, prompt, exact: true,
        M: countTokens(prompt, enc), fields: total });
    }
    /* G2b: GRAMMA base (JSON dialects): GRAMMA's own reader, then restore. */
    const g = grammaEncode(reduced, enc, { dialects: GNOMON_GRAMMA_DIALECTS });
    if (g.exact && gnomonWireOk(g.inner) && grammaDecode(g.decoderPrompt) === reduced && gnomonRestore(grammaDecode(g.decoderPrompt), rules) === text) {
      const prompt = gnomonCompose(g.decoderPrompt, rules);
      cands.push({ rules, base: 'gramma', reduced, wire: g.wire, innerPrompt: g.decoderPrompt, prompt, exact: true,
        M: countTokens(prompt, enc), fields: total });
    }
  }
  /* G3: smallest exact arm wins; the array order (plain DAEDALUS, plain GRAMMA first) breaks ties, so the
   *     result is never above the frontier. */
  const all = [...cands];
  all.sort((a, b) => a.M - b.M || a.rules.length - b.rules.length);
  const best = all[0];
  const decoded = gnomonRestore(best.base === 'daedalus' ? daedalusDecode(best.wire) : grammaDecode(best.innerPrompt), best.rules);
  const fieldCount: Record<GnomonRule, number> = { rest: 0, npm: 0 };
  if (best.rules.length) for (const r of best.rules) fieldCount[r] = gnomonReduce(text, [r]).fields[r];
  const label = (c: GnomonCandidate) => `${c.rules.join('+') || 'plain'}/${c.base}`;
  return {
    codec: 'gnomon',
    wire: best.wire,
    decoded,
    exact: decoded === text,
    inTokens: plainD.inTokens,
    frontierM,
    messageTokens: best.M,
    base: best.base,
    rules: best.rules,
    fields: fieldCount,
    decoderPrompt: best.prompt,
    candidates: all.map(c => ({ rules: c.rules.join('+') || 'plain', base: c.base, M: c.M, exact: c.exact })),
    notes: `frontierM=${frontierM}; chosen=${label(best)} M=${best.M}; fields rest=${fieldCount.rest} npm=${fieldCount.npm}`,
  };
}
