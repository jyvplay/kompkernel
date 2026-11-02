/**
 * OURA (οὐρά — "tail, rear").
 *
 * X38. Every numeric shape in this stack — the four fixed ones in SYMPLOKE and
 * the whole learned lattice — is built on ONE hypothesis: that the digit groups
 * of a pattern have a CONSTANT width vector. `symplokeLearn` scans for
 *
 *     \d+ (sep \d+){k-1}
 *
 * and rejects the shape outright the moment two matches disagree on any width:
 *
 *     if (w.length !== cur.length || w.some((x,i) => x !== cur[i])) { ok = false; break; }
 *
 * That rejection is what makes the collapse self-identifying. A collapse is
 * recognised by the LENGTH of its digit run — `digitRuns(out).filter(r =>
 * r.end - r.start === f.len)` — and a constant width vector makes the collapsed
 * length a constant, so "a run of exactly 8 digits is a date" is a decidable
 * rule needing no per-run marker.
 *
 * The hypothesis is also false for a large and completely ordinary family of
 * real numbers. A semantic version has three groups whose widths vary:
 *
 *     1.0.0    22.1.1    0.35.4    4.1.17
 *
 * Two of the three groups are always one digit here and the third is not, so
 * the vector is [1,1,1] for some matches and [2,1,2] for others, every shape is
 * rejected, and every dot is paid for at full price. The same is true of
 * fixed-precision decimals with a varying integer part (`77.44539475`,
 * `100.62342100`), of times carrying fractional seconds, and of any field where
 * the trailing precision is fixed by convention and only the head grows.
 *
 * What is constant in all of those is not the vector — it is the TAIL.
 *
 * THE CONSTRUCTION. OURA relaxes the hypothesis from "the whole width vector is
 * constant" to "the width vector EXCLUDING THE FIRST GROUP is constant", and
 * pays for the relaxation by reading from the right:
 *
 *     collapse:  1 . 0 . 0   ->  100
 *     restore:   take the last 1 digit, then the last 1 digit before it,
 *                then everything that remains; join with '.'
 *                100 -> 1 | 0 | 0 -> 1.0.0
 *
 * Splitting from the tail is exact and total: the suffix widths consume a fixed
 * number of digits from the right, so whatever survives at the left is the
 * head, whatever its length. No carry, no base conversion, no arithmetic — a
 * reader counts characters off the right-hand end, which is the easiest
 * direction to count in because the suffix is fixed.
 *
 * THE PRICE OF THE RELAXATION. A constant-width collapse is recognised by its
 * length and needs no marker. A tail-anchored collapse has a VARIABLE collapsed
 * length, so length alone no longer identifies it, and the ambiguity has to be
 * closed one of two ways:
 *
 *   MARK — put a sentinel immediately before each collapsed run. Costs one
 *          token per run, buys certainty.
 *   PLAIN — ship no marker, and prove instead that no digit run anywhere in the
 *          emitted text other than a collapsed one is long enough to be
 *          mistaken for one. Costs nothing, but is only available when the
 *          document happens to be clean.
 *
 * Both are offered and both are measured; the encoder takes the cheaper one
 * only when its measured full message is strictly smaller than the parent's.
 *
 * SAFETY WITH RESPECT TO THE LAYER BELOW. OURA runs before SYMPLOKE's shape
 * collapse, and a collapse here changes digit-run lengths there. Two guards
 * make that safe. First, a candidate is only considered where the constant-width
 * learner has already REFUSED — if the head width is constant, SYMPLOKE owns the
 * pattern and OURA keeps its hands off, so the two never claim the same span.
 * Second, no match may overlap a fixed-tier shape (date8, time6, dtT, dtSp),
 * which are matched by literal regex and would otherwise be cut in half.
 *
 * Source article: none. The four fixed shapes and the constant-width lattice
 * are original to this repository (X25, X32); the observation that the constant
 * width hypothesis is strictly stronger than the data requires, the tail-anchored
 * relaxation, the mark/plain ambiguity resolution, and both guards are original
 * here. The general idea that a "shape" is a declarable, restorable format is
 * the same one TIMEMA and SYMPLOKE introduced.
 *
 * Greedy: no. Every candidate shape is scored on the measured token count of
 * the real message it produces, and the transform ships only when that count is
 * strictly below the parent's.
 *
 * Bound: CPU-bound. The scan is O(n) per (separator, k) pair over 7 separators
 * and k in 2..5, the same order as the lattice it extends, and only the winning
 * shape is applied.
 *
 * Honest size: this fires only on documents carrying numeric fields whose
 * trailing precision is fixed and whose leading part varies — version strings
 * above all, then fixed-precision decimals and sub-second times. It does
 * nothing on prose, on dates, or on uniform-width numeric tables, all of which
 * SYMPLOKE already owns. It says so rather than pretending otherwise.
 */

import { countTokens, type EncodingName } from './bpe';
import { euteleiaEncode, euteleiaDecode, type EuteleiaResult } from './euteleia';
import { workState, workConsume, chironConsume } from './workmeter';
import type { Framing } from './anadiplosis';

/** Separators scanned, matching the lattice OURA extends. */
export const OURA_SEPS = ['.', ',', ':', '-', '/', '_', ' '] as const;
export const OURA_K_MIN = 2;
export const OURA_K_MAX = 5;
/** A shape must match at least this often to repay its clause. */
export const OURA_MIN_MATCHES = 4;
/** Sentinels, cheapest first; a sentinel must be absent from the source. */
export const OURA_SENTINELS = ['~', '^', '`', '|', '\\', '@', '#', '$', '%', '&', '*', '+', '=', '?', '!'] as const;
export const OURA_MAX_MATCHES = 20000;
/**
 * How many (shape, mode) pairs are carried through the full stack. The scan is
 * cheap and the stack is not, so candidates are ranked by an estimate and only
 * the head of the list is measured.
 */
export const OURA_MAX_TRIALS = 2;

const isDig = (c: string | undefined): boolean => c !== undefined && c >= '0' && c <= '9';

/** The four fixed shapes, matched literally so OURA can refuse to cut them. */
const FIXED_RES: RegExp[] = [
  /\d{4}-\d{2}-\d{2}/g,
  /\d{2}:\d{2}:\d{2}/g,
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g,
  /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g,
];

export interface OuraShape {
  /** separator joining the groups */
  sep: string;
  /** total number of groups */
  k: number;
  /** widths of groups 2..k, read from the right */
  suf: number[];
  /** how many digits the collapsed form needs at minimum */
  minLen: number;
  /** matches, as [start,end) in the source */
  spans: Array<[number, number]>;
  /** rebuilt text for each match, for the collapse */
  bare: string[];
}

/** Read a digit run back apart using the tail-anchored widths. */
export function ouraExpand(digits: string, sep: string, suf: number[]): string {
  const parts: string[] = [];
  let end = digits.length;
  for (let i = suf.length - 1; i >= 0; i--) {
    const w = suf[i];
    if (end - w < 1) return digits; // cannot happen for a well-formed collapse
    parts.unshift(digits.slice(end - w, end));
    end -= w;
  }
  parts.unshift(digits.slice(0, end));
  return parts.join(sep);
}

function fixedMask(text: string): Uint8Array {
  const mask = new Uint8Array(text.length);
  for (const re of FIXED_RES) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      for (let i = m.index; i < m.index + m[0].length; i++) mask[i] = 1;
    }
  }
  return mask;
}

/**
 * Find every tail-anchored shape the constant-width learner cannot express:
 * the suffix widths agree across all matches while the head width does not.
 */
export function ouraFind(text: string): OuraShape[] {
  if (!text.length) return [];
  const fmask = fixedMask(text);
  const out: OuraShape[] = [];
  for (const sep of OURA_SEPS) {
    const esc = sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (let k = OURA_K_MIN; k <= OURA_K_MAX; k++) {
      const re = new RegExp(`\\d+(?:${esc}\\d+){${k - 1}}`, 'g');
      type Acc = { suf: number[]; heads: Set<number>; spans: Array<[number, number]>; bare: string[] };
      const bySuf = new Map<string, Acc>();
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        const s = m.index, e = m.index + m[0].length;
        if (isDig(text[s - 1]) || isDig(text[e])) continue;
        let touchesFixed = false;
        for (let i = s; i < e; i++) if (fmask[i]) { touchesFixed = true; break; }
        if (touchesFixed) continue;
        const groups = m[0].split(sep);
        const key = groups.slice(1).map((g) => g.length).join(',');
        let acc = bySuf.get(key);
        if (!acc) {
          acc = { suf: groups.slice(1).map((g) => g.length), heads: new Set(), spans: [], bare: [] };
          bySuf.set(key, acc);
        }
        acc.heads.add(groups[0].length);
        acc.spans.push([s, e]);
        acc.bare.push(groups.join(''));
        if (acc.spans.length >= OURA_MAX_MATCHES) break;
      }
      for (const [, acc] of bySuf) {
        // the head must actually vary, or SYMPLOKE's constant-width lattice owns it
        if (acc.spans.length < OURA_MIN_MATCHES || acc.heads.size < 2) continue;
        const minLen = acc.suf.reduce((a, b) => a + b, 0) + 1;
        out.push({ sep, k, suf: acc.suf, minLen, spans: acc.spans, bare: acc.bare });
      }
    }
  }
  return out;
}

/** Longest digit-run length in `text`, used to decide whether PLAIN is safe. */
function longestBareRun(text: string): number {
  let best = 0, i = 0;
  while (i < text.length) {
    if (!isDig(text[i])) { i++; continue; }
    let j = i;
    while (isDig(text[j])) j++;
    if (j - i > best) best = j - i;
    i = j + 1;
  }
  return best;
}

export interface OuraPlan {
  shape: OuraShape;
  mode: 'mark' | 'plain' | 'lead';
  sentinel: string;
  text: string;
  clause: string;
  matches: number;
  /** separators eliminated */
  seps: number;
}

/**
 * Clause wordings. The clause is spliced into the contract in front of a
 * sentence that already exists, so its price is the price of the junction, not
 * of the clause alone — the same lesson EUTELEIA taught for the run-length
 * clause. Every wording is therefore scored by MEASURING the exact contract it
 * produces and the cheapest wins.
 */
export function ouraClausesFor(
  shape: OuraShape,
  mode: 'mark' | 'plain' | 'lead',
  sentinel: string,
): string[] {
  const tail = shape.suf.join(',');
  const sep = shape.sep;
  const many = shape.suf.length > 1;
  const bare: string[] = [];
  if (mode === 'mark') {
    bare.push(`${sentinel}N = N with ${sep} before its last ${tail} digits. Drop ${sentinel}.`);
    bare.push(`After ${sentinel}, a number has ${sep} before its last ${tail} digits.`);
    bare.push(`${sentinel} before digits: the last ${tail} digits each follow a ${sep}; drop it.`);
    bare.push(`${sentinel}N: put ${sep} before the last ${many ? tail : tail} digit${many ? 's' : ''}, then drop the ${sentinel}.`);
  } else if (mode === 'lead') {
    bare.push(`${sep}N: last ${tail} digits get ${sep} before each.`);
    bare.push(`X${sep}Y: the last ${tail} digits take a ${sep} each.`);
    bare.push(`After ${sep}, the last ${tail} digits each get a ${sep} before them.`);
  } else {
    bare.push(`Digits of ${shape.minLen}+: ${sep} goes before the last ${tail} digits.`);
    bare.push(`A run of ${shape.minLen} or more digits: ${sep} before its last ${tail} digits.`);
    bare.push(`${shape.minLen}+ digits: dot the last ${tail}.`);
  }
  return bare;
}

/** Build the rewritten text for one shape in one mode. */
function applyShape(text: string, shape: OuraShape, mode: 'mark' | 'plain' | 'lead', sentinel: string): string {
  const n = shape.spans.length;
  let out = '';
  let cursor = 0;
  for (let i = 0; i < n; i++) {
    const [s, e] = shape.spans[i];
    out += text.slice(cursor, s);
    if (mode === 'mark') out += sentinel + shape.bare[i];
    else if (mode === 'plain') out += shape.bare[i];
    else {
      // LEAD: keep the head and its separator, drop the rest. The surviving
      // separator is what marks the run, so no sentinel is paid for.
      const bare = shape.bare[i];
      const headLen = bare.length - shape.suf.reduce((a, b) => a + b, 0);
      out += bare.slice(0, headLen) + shape.sep + bare.slice(headLen);
    }
    cursor = e;
  }
  out += text.slice(cursor);
  return out;
}

/**
 * LEAD soundness. The collapse reads as `<head> <sep> <tail-digits>` where the
 * tail has exactly `sufSum` digits. It is sound only if no OTHER occurrence of
 * that pattern exists in the emitted text, so scan for it and compare against
 * the spans we wrote.
 */
function leadIsSound(emitted: string, shape: OuraShape, starts: Set<number>): boolean {
  const sufSum = shape.suf.reduce((a, b) => a + b, 0);
  const esc = shape.sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\d+${esc}\\d{${sufSum}}(?![\\d])`, 'g');
  let m: RegExpExecArray | null;
  let seen = 0;
  while ((m = re.exec(emitted))) {
    const s = m.index;
    if (isDig(emitted[s - 1])) return false;      // part of a longer run
    if (!starts.has(s)) return false;             // an ordinary number would be misread
    seen++;
  }
  return seen === shape.spans.length;
}

/**
 * Undo one OURA collapse. `mode`/`sentinel`/`shape` are carried on the result;
 * the reference decoder below is exactly what the receiving model is asked to do.
 */
export function ouraUndo(
  text: string,
  shape: { sep: string; suf: number[]; minLen: number },
  mode: 'mark' | 'plain' | 'lead',
  sentinel: string,
): string {
  if (mode === 'lead') {
    const sufSum = shape.suf.reduce((a, b) => a + b, 0);
    const esc = shape.sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(\\d+)${esc}(\\d{${sufSum}})(?![\\d])`, 'g');
    return text.replace(re, (_all, head: string, tail: string) =>
      head + shape.sep + ouraExpand(tail, shape.sep, shape.suf));
  }
  if (mode === 'mark') {
    if (!text.includes(sentinel)) return text;
    let out = '';
    let i = 0;
    while (i < text.length) {
      const a = text.indexOf(sentinel, i);
      if (a < 0) { out += text.slice(i); break; }
      out += text.slice(i, a);
      let j = a + sentinel.length;
      while (isDig(text[j])) j++;
      const run = text.slice(a + sentinel.length, j);
      out += run.length >= shape.minLen ? ouraExpand(run, shape.sep, shape.suf) : sentinel + run;
      i = j;
    }
    return out;
  }
  // plain: every digit run at least minLen long is a collapse
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (!isDig(text[i])) { out += text[i]; i++; continue; }
    let j = i;
    while (isDig(text[j])) j++;
    const run = text.slice(i, j);
    out += run.length >= shape.minLen ? ouraExpand(run, shape.sep, shape.suf) : run;
    i = j;
  }
  return out;
}

export interface OuraResult extends EuteleiaResult {
  oura: boolean;
  /** number of spans rewritten */
  ouraMatches: number;
  /** separators eliminated */
  ouraSeps: number;
  /** the contract clause, '' when the transform did not fire */
  ouraClause: string;
  /** everything the decoder needs, in one place */
  ouraShape: { sep: string; suf: number[]; minLen: number; k: number } | null;
  ouraMode: 'mark' | 'plain' | 'lead';
  ouraSentinel: string;
}

/* ===========================================================================
 * X67 — ENTRY-STATE MEMO (speed lane, decision preserving)
 *
 * MEASURED PROBLEM. The whole TAGSTACK frontier measures every parent on the
 * SAME source, and four of those parents begin with an *identical* call:
 *
 *     apographe -> ouraEncode(text, enc, opts)      (first statement)
 *     metron    -> apographeEncode(text, enc, {..kanon:true}) -> ouraEncode(text, ...)
 *     diastema  -> ouraEncode(text, enc, opts)      (first statement)
 *
 * `ouraEncode` is the expensive part of each of them: on the recorded 1,203-char
 * frontier lane the OURA/CHIRON search is ~11 s for APOGRAPHE and ~33 s for
 * DIASTEMA (which exhausts its 2.12 M work budget), i.e. the same deterministic
 * computation is bought twice. bench/x67/work.ts measures the split.
 *
 * WHY A NAIVE MEMO WOULD BE WRONG. The search is bounded by the deterministic
 * work meter (workmeter.ts), whose result depends on the counters *at entry*.
 * A second call inside the same epoch starts with fewer units left and may
 * legitimately return a different wire. A result-keyed cache that ignored the
 * counters could therefore change an emitted message.
 *
 * WHY THIS MEMO IS EXACT. It only fires when the meter state at entry is
 * `depth === 1 && used === 0 && chironUsed === 0` — i.e. at the *start* of a
 * fresh outermost epoch, which `workEpoch` always creates with the same
 * budgets for the same source length. Two such calls are the same pure
 * function of `(text, enc, options-that-reach-the-chain)` and provably return
 * the same object; the memo only spares the second computation. Every other
 * entry state (nested, mid-epoch, explicitly different budget) bypasses the
 * memo and runs the ordinary code.
 *
 * The key contains: encoding, the exact source text, the *closure-visible*
 * option subset, and both budgets. Options that only APOGRAPHE reads (kanon /
 * apographe / forceLifts / forceSep / noGate) are excluded from the key HERE
 * *and* stripped by the caller (apographe.ts) so the two call sites agree;
 * bench/x67/oura-memo.ts asserts that the 110-file transitive closure of this
 * module reads no such key. A hit returns a structured clone, so a caller that
 * mutates its result cannot poison the entry.
 * ======================================================================== */

/** Option keys that `ouraEncode` and its transitive closure actually read. */
const OURA_CLOSURE_OPTION_KEYS = [
  'alphabet', 'anadiplosis', 'allowPolyglot', 'bootstrap', 'budgetMs',
  'clauseLadder', 'dualTokenizer', 'forceScript', 'framing', 'group', 'hardWorkUnits',
  'inCap', 'inGate', 'ladder', 'levels', 'marker', 'marker2', 'markers',
  'maxBootstrapRules', 'maxEvals', 'maxRules', 'maxSpan', 'minGainOverride',
  'minHexChars', 'minRun', 'noAssign', 'noBlocks', 'noMacros', 'noRelayout',
  'noSearch', 'order', 'oura', 'ouraMode', 'ouraSentinel', 'ouraSentinels',
  'ouraShape', 'restarts', 'script', 'scriptName', 'sep', 'stats', 'syncope',
  'topK', 'undo', 'workUnits',
];

let ouraMemoHits = 0;
let ouraMemoMisses = 0;
const OURA_MEMO_MAX = 24;
interface OuraMemoEntry { result: OuraResult; work: number; chiron: number }
const OURA_MEMO = new Map<string, OuraMemoEntry>();

export function ouraMemoStats(): { hits: number; misses: number; size: number } {
  return { hits: ouraMemoHits, misses: ouraMemoMisses, size: OURA_MEMO.size };
}

export function ouraMemoClear(): void {
  OURA_MEMO.clear(); ouraMemoHits = 0; ouraMemoMisses = 0;
}

function ouraMemoKey(text: string, enc: EncodingName, opts: any, budget: number, chironBudget: number): string | null {
  if (opts === null || typeof opts !== 'object') return null;
  const parts: string[] = [];
  for (const k of OURA_CLOSURE_OPTION_KEYS) {
    const v = (opts as any)[k];
    if (v === undefined) continue;
    if (typeof v === 'function' || typeof v === 'symbol') return null;
    parts.push(k + '=' + JSON.stringify(v));
  }
  // any function-valued option the closure might read later must defeat the memo
  for (const k of Object.keys(opts)) {
    const v = (opts as any)[k];
    if (typeof v === 'function' || typeof v === 'symbol') return null;
  }
  return `${enc}\u0000${budget}\u0000${chironBudget}\u0000${parts.join('\u0001')}\u0000${text}`;
}

/**
 * Encode: collapse one tail-anchored numeric shape, then run the stack.
 * Never ships a regression.
 *
 * X67: identical fresh-epoch calls are computed once (see the memo note above).
 */
export function ouraEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: any = {},
): OuraResult {
  if (ouraMemoDisabled()) return ouraEncodeUncached(text, enc, opts);
  const st = workState();
  if (st.depth !== 1 || st.used !== 0 || st.chironUsed !== 0) {
    return ouraEncodeUncached(text, enc, opts);
  }
  const key = ouraMemoKey(text, enc, opts, st.budget, st.chironBudget);
  if (key === null) return ouraEncodeUncached(text, enc, opts);
  const hit = OURA_MEMO.get(key);
  if (hit) {
    // REPLAY, do not skip. The meter is epoch-scoped and its remaining budget
    // decides what every LATER stage in the same epoch does. Returning for free
    // would hand the caller units it would not otherwise have, which was
    // measured to lengthen DIASTEMA's interval search (36.5 s -> 49.9 s) and to
    // change which wire it returns. Charging the recorded cost back makes the
    // meter trajectory — and therefore every later decision — identical to the
    // uncached run; only wall-clock work disappears.
    workConsume(hit.work);
    chironConsume(hit.chiron);
    ouraMemoHits++;
    return structuredClone(hit.result);
  }
  ouraMemoMisses++;
  const result = ouraEncodeUncached(text, enc, opts);
  if (OURA_MEMO.size >= OURA_MEMO_MAX) OURA_MEMO.clear();
  const after = workState();
  OURA_MEMO.set(key, { result, work: after.used - st.used, chiron: after.chironUsed - st.chironUsed });
  return structuredClone(result);
}

/** `OMEGA_OURA_MEMO=0` disables the X67 memo (audit A/B switch). */
function ouraMemoDisabled(): boolean {
  const env = typeof process !== 'undefined' ? process.env?.OMEGA_OURA_MEMO : undefined;
  return env === '0' || env === 'false';
}

function ouraEncodeUncached(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: any = {},
): OuraResult {
  const parent = euteleiaEncode(text, enc, opts);
  const plain: OuraResult = {
    ...parent, oura: false, ouraMatches: 0, ouraSeps: 0, ouraClause: '',
    ouraShape: null, ouraMode: 'mark', ouraSentinel: '',
  };
  if (opts.oura === false) return plain;
  if (!text.length || text.length > 400_000) return plain;

  const shapes = ouraFind(text);
  if (!shapes.length) return plain;

  // Sentinels and framing characters must be absent from the source, or the
  // reader cannot tell an emitted mark from ordinary text.
  const sentinels = (opts.ouraSentinels ?? OURA_SENTINELS).filter(
    (s: string) => !text.includes(s));
  const modes: Array<'mark' | 'plain' | 'lead'> = ['lead', 'plain', 'mark'];

  // Rank cheaply: a match removes (k-1) separators and, in MARK mode, pays one
  // token for the sentinel. Only the head of the list is worth a full encode.
  const ranked = shapes
    .map((shape) => ({
      shape,
      est: shape.spans.length * (shape.k - 1),
    }))
    .sort((a, b) => b.est - a.est)
    .slice(0, OURA_MAX_TRIALS);

  let best: { total: number; r: EuteleiaResult; plan: OuraPlan } | null = null;
  for (const { shape } of ranked) {
    for (const mode of modes) {
      const sentinelList = mode === 'mark' ? sentinels.slice(0, 1) : [''];
        if (mode === 'lead' && shape.k < 3) continue;   // LEAD can only drop k-2 separators
      for (const sentinel of sentinelList) {
        const rewritten = applyShape(text, shape, mode, sentinel);
        if (rewritten === text) continue;
        if (mode === 'lead') {
          // shift the recorded starts to the emitted coordinate space is not
          // needed: applyShape preserves everything before each span, so the
          // start of span i in `rewritten` is spanStart[i] + (shrinkage so far)
          const starts = new Set<number>();
          let off = 0;
          for (let i = 0; i < shape.spans.length; i++) {
            starts.add(shape.spans[i][0] + off);
            off -= (shape.k - 2);   // separators dropped from this and earlier spans
          }
          if (!leadIsSound(rewritten, shape, starts)) continue;
        }
        if (mode === 'plain') {
          // PLAIN is only sound when no digit run OUTSIDE the collapsed spans
          // is long enough to be mistaken for one. Measure the source between
          // the spans, not the rewritten text, which already holds collapses.
          let outside = '';
          let c2 = 0;
          for (const [s, e] of shape.spans) { outside += text.slice(c2, s); c2 = e; }
          outside += text.slice(c2);
          if (longestBareRun(outside) >= shape.minLen) continue;
        }
        // soundness first: the rewrite must be exactly invertible on its own
        if (ouraUndo(rewritten, shape, mode, sentinel) !== text) continue;
        let r: EuteleiaResult;
        try { r = euteleiaEncode(rewritten, enc, opts); } catch { continue; }
        // Score every wording against the EXACT contract it produces.
        const contractTail = '; print only.';
        const baseTail = countTokens(' ' + contractTail, enc);
        let clause = '';
        let clauseTok = Infinity;
        for (const c of ouraClausesFor(shape, mode, sentinel)) {
          const t = countTokens(' ' + c + contractTail, enc) - baseTail;
          if (t < clauseTok) { clauseTok = t; clause = c; }
        }
        const total = r.messageTokens + clauseTok;
        if (total >= parent.messageTokens) continue;
        if (!best || total < best.total) {
          best = { total, r, plan: { shape, mode, sentinel, text: rewritten, clause, matches: shape.spans.length, seps: shape.spans.length * (shape.k - 1) } };
        }
      }
    }
  }
  if (!best) return plain;

  return {
    ...best.r,
    contract: best.r.contract
      ? best.r.contract.replace(/; print only\.$/, ` ${best.plan.clause} print only.`)
      : best.plan.clause,
    messageTokens: best.total,
    oura: true,
    ouraMatches: best.plan.matches,
    ouraSeps: best.plan.seps,
    ouraClause: best.plan.clause,
    ouraShape: { sep: best.plan.shape.sep, suf: best.plan.shape.suf, minLen: best.plan.shape.minLen, k: best.plan.shape.k },
    ouraMode: best.plan.mode,
    ouraSentinel: best.plan.sentinel,
  };
}

/** Decode: undo the collapse, then hand to the parent. */
export function ouraDecode(
  wire: string,
  cfg: { stats?: any; order?: 'in' | 'out'; undo: (w: string) => string },
  opts: {
    alphabet?: string; marker?: string; marker2?: string; group?: any; framing?: Framing;
    ouraShape?: { sep: string; suf: number[]; minLen: number } | null;
    ouraMode?: 'mark' | 'plain' | 'lead'; ouraSentinel?: string;
  } = {},
): string {
  const expanded = euteleiaDecode(wire, cfg, opts);
  const shape = opts.ouraShape;
  if (!shape) return expanded;
  return ouraUndo(expanded, shape, opts.ouraMode ?? 'mark', opts.ouraSentinel ?? '');
}
