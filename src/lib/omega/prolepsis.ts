import { now } from './clock';
import { nativeLcp } from './lcp-native';
let nativeLcpScope=false;
/** X148 opt-in synchronous experiment; changes only exact LCP implementation. */
export function prolepsisNativeLcpScope<T>(fn:()=>T):T {
 const old=nativeLcpScope;nativeLcpScope=true;
 try{return fn();}finally{nativeLcpScope=old;}
}
/**
 * ΠΡΟΛΗΨΙΣ (PROLEPSIS — "taking beforehand") — the prefix-anchored count.
 * =============================================================================
 *
 * WHAT THE PROFILE SAID, BEFORE ANY OF THIS EXISTED
 * -----------------------------------------------------------------------------
 * `node --cpu-prof` over the shipped X120 stack on `apt-real` (receipts/prof,
 * bench/x121/receipts/*.json): the tokenizer path is ~62 % of self time, and a
 * single lane performs **1 016 908 full-string tokenizations** against 119 580
 * long-cache hits — a 10 % hit rate. Every one of those misses re-runs the
 * pre-tokenizer over the WHOLE candidate message to learn a number the encoder
 * already knew for a message that differed from it in one place.
 *
 * THE MECHANISM
 * -----------------------------------------------------------------------------
 * X120 proved the state theorem for ΒΕΛΤΙΣΤΟΣ's search:
 *
 *      tokens(A + B) = tokens(A) − tokens(tail(A)) + tokens(tail(A) + B)
 *
 * where `tail(s)` is the suffix of `s` beginning at its last non-whitespace
 * pre-tokenizer chunk. That is not a fact about search, it is a fact about the
 * tokenizer: **the token count is a fold, and a fold can be resumed.** So a
 * string that shares a prefix with a string already counted needs only the part
 * after the split to be counted — the shared prefix is shared computation.
 *
 * This module is the general form of that. It keeps a small ring of ANCHORS
 * (fully counted messages), each carrying marks every `STRIDE` characters at a
 * chunk boundary with the running total and the exact tail at that point. A new
 * string is matched against the anchors, the longest usable mark is taken, and
 * the count resumes from there:
 *
 *      tokens(S) = mark.total − mark.tailTok + tokens(mark.tail + S.slice(mark.pos))
 *
 * WHY THIS IS NOT THE MEMO THAT ALREADY EXISTS
 * -----------------------------------------------------------------------------
 * The long cache keys on the WHOLE string, so it pays only for a byte-identical
 * repeat. The searches here produce VARIANTS: ΔΙΑΓΡΑΦΗ writes one rule's value
 * back, ΜΕΤΑΤΑΞΙΣ relocates one rule, ΓΕΝΝΑΔΑΣ re-spells one value, ΠΕΡΙΚΟΠΉ
 * edits one clause. Those are exactly the strings the whole-string memo misses
 * and exactly the ones a prefix-anchored fold catches.
 *
 * WHY THE TAIL IS EXACT AND NOT AN APPROXIMATION
 * -----------------------------------------------------------------------------
 * Two facts, both asserted by a test rather than argued:
 *   (a) BPE never merges across a pre-tokenizer chunk boundary, so the token
 *       count of a concatenation of whole chunks is the SUM of their counts.
 *       That is how `tokenTail` in bpe.ts already computes `tailTok`, and it is
 *       what lets this module track the tail in O(1) per chunk instead of
 *       re-tokenizing the prefix at every mark.
 *   (b) The resumption identity above is X120's theorem, re-verified here on
 *       every mark actually used (bench/x121/prolepsis-unit.ts) and on every
 *       lane (the A/B's `samePriceHashStable` and byte-identical totals).
 *
 * SAFETY AND SCOPE
 * -----------------------------------------------------------------------------
 * The counter returns an INTEGER that is compared, on every call in the unit
 * test and on every lane in the A/B, against the unaccelerated reference
 * `countTokensExact`. It is never used to build a wire, only to price one, and
 * a lane whose price is wrong is a lane whose totals move — which the A/B
 * measures. `OMEGA_NO_PROLEPSIS=1` (or `OMEGA_PROLEPSIS=0`) restores the exact
 * X120 path.
 *
 * CPU-bound by construction: every loop is bounded by an iteration count, never
 * by `Date.now()` (X104's lesson — a clock-bounded loop here would make the
 * wire a function of machine load).
 * =============================================================================
 */

export interface ProlepsisMark {
  /** character offset in the anchor, always at a pre-tokenizer chunk boundary */
  pos: number;
  /** tokens(anchor.slice(0, pos)) */
  total: number;
  /** tail(anchor.slice(0, pos)) — the exact Markov state at `pos` */
  tail: string;
  /** tokens(tail) alone */
  tailTok: number;
}

interface Anchor {
  text: string;
  enc: string;
  pos: Int32Array;
  total: Float64Array;
  tail: string[];
  tailTok: Float64Array;
  n: number;
}

/* ---------------------------------------------------------------------------
 * Knobs. All read per call, never at module load: X104 established that a
 * load-time const in this repository reads the environment before the probe
 * sets it, so the flag silently never takes effect anywhere in the repo.
 * ------------------------------------------------------------------------- */

function envOff(): boolean {
  try {
    if (typeof process === 'undefined' || !process.env) return false;
    return process.env.OMEGA_NO_PROLEPSIS === '1'
      || process.env.OMEGA_PROLEPSIS === '0'
      || process.env.OMEGA_PROLEPSIS === 'false';
  } catch { return false; }
}
function envNum(name: string, dflt: number, lo: number, hi: number): number {
  try {
    if (typeof process === 'undefined' || !process.env) return dflt;
    const raw = process.env[name];
    if (raw === undefined) return dflt;
    const n = Number(raw);
    return Number.isFinite(n) && n >= lo && n <= hi ? n : dflt;
  } catch { return dflt; }
}

interface ProlepsisConfig {disabled:boolean;stride:number;anchors:number;minPrefix:number}
let scopedConfig:ProlepsisConfig|null=null;
/** X146 experiment: snapshot knobs at synchronous call entry, not module load.
 * Explicit opt-in API; callers must not mutate these four knobs inside fn.
 * Nested scopes inherit the snapshot; finally restores dynamic reads.
 */
export function prolepsisConfigScope<T>(fn:()=>T):T {
 if(scopedConfig)return fn();
 scopedConfig={disabled:envOff(),stride:envNum('OMEGA_PROLEPSIS_STRIDE',256,16,1<<16),anchors:envNum('OMEGA_PROLEPSIS_ANCHORS',8,1,64),minPrefix:envNum('OMEGA_PROLEPSIS_MIN_PREFIX',48,0,1<<20)};
 try{return fn();}finally{scopedConfig=null;}
}
export function prolepsisDisabled(): boolean { return scopedConfig?.disabled??envOff(); }
export function prolepsisStride(): number { return scopedConfig?.stride??envNum('OMEGA_PROLEPSIS_STRIDE', 256, 16, 1 << 16); }
export function prolepsisAnchors(): number { return scopedConfig?.anchors??envNum('OMEGA_PROLEPSIS_ANCHORS', 8, 1, 64); }
/** Shortest shared prefix worth resuming from. Below this the bookkeeping costs
 *  more than the fold it saves. */
export function prolepsisMinPrefix(): number { return scopedConfig?.minPrefix??envNum('OMEGA_PROLEPSIS_MIN_PREFIX', 48, 0, 1 << 20); }
/** A mark whose tail is longer than this is not recorded: resuming through a
 *  huge tail would cost more than it saves. The tail is normally one chunk. */
export const PROLEPSIS_MAX_TAIL = 64;
export const PROLEPSIS_MAX_MARKS = 256;
/** Anchors longer than this are not kept (memory). */
export const PROLEPSIS_MAX_ANCHOR_CHARS = 65_536;

const ring: Anchor[] = [];
let ringAt = 0;
let lookups = 0, hits = 0, savedChars = 0, countedChars = 0, marksMade = 0;
let lcpWork = 0, gateStops = 0;

export function prolepsisReset(): void {
  ring.length = 0; ringAt = 0;
  lookups = 0; hits = 0; savedChars = 0; countedChars = 0; marksMade = 0;
  lcpWork = 0; gateStops = 0;
}
export function prolepsisStats() {
  let anchorChars = 0;
  for (const a of ring) anchorChars += a.text.length;
  return { anchors: ring.length, anchorChars, lookups, hits,
    hitRate: lookups ? +(hits / lookups).toFixed(4) : 0,
    savedChars, countedChars,
    savedFraction: countedChars ? +(savedChars / (savedChars + countedChars)).toFixed(4) : 0,
    marks: marksMade, lcpWork, gateStops };
}

/** Longest common prefix of `a` and `b`, compared at most `limit` characters. */
function lcp(a: string, b: string, limit: number): number {
  if(nativeLcpScope)return nativeLcp(a,b,limit);
  const n = Math.min(a.length, b.length, limit);
  let i = 0;
  // 8-wide unrolled compare; the strings here are thousands of characters and
  // the common case is a long shared prefix, so this is the whole inner cost.
  while (i + 8 <= n) {
    if (a.charCodeAt(i) !== b.charCodeAt(i)) return i;
    if (a.charCodeAt(i + 1) !== b.charCodeAt(i + 1)) return i + 1;
    if (a.charCodeAt(i + 2) !== b.charCodeAt(i + 2)) return i + 2;
    if (a.charCodeAt(i + 3) !== b.charCodeAt(i + 3)) return i + 3;
    if (a.charCodeAt(i + 4) !== b.charCodeAt(i + 4)) return i + 4;
    if (a.charCodeAt(i + 5) !== b.charCodeAt(i + 5)) return i + 5;
    if (a.charCodeAt(i + 6) !== b.charCodeAt(i + 6)) return i + 6;
    if (a.charCodeAt(i + 7) !== b.charCodeAt(i + 7)) return i + 7;
    i += 8;
  }
  while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i++;
  return i;
}

/**
 * Find the best mark to resume `text` from, or null.
 * Picks the anchor with the longest shared prefix and, within it, the largest
 * mark position that the shared prefix actually covers. Returns null unless the
 * resumed prefix clears `prolepsisMinPrefix()`.
 */
export function prolepsisLookup(text: string, enc: string): ProlepsisMark | null {
  if (prolepsisDisabled() || ring.length === 0) return null;
  const minPrefix = prolepsisMinPrefix();
  if (text.length < minPrefix) return null;
  lookups++;
  let best: ProlepsisMark | null = null;
  let bestPos = 0;
  // Newest anchor first: the next candidate is most often a variant of the one
  // that was just counted, so the first probe usually sets a high `bestPos`,
  // which is what makes the gate below reject the rest in O(1).
  for (let s = 0; s < ring.length; s++) {
    const a = ring[(ringAt + ring.length - 1 - s) % ring.length]!;
    if (a.enc !== enc) continue;
    const limit = Math.min(a.text.length, text.length);
    if (limit <= bestPos) continue;             // cannot beat what we already have
    // O(1) GATE. To beat `bestPos` this anchor must agree with `text` AT
    // `bestPos`; if it does not, its common prefix is <= bestPos and there is
    // nothing to scan. This is what makes a wide ring affordable: the full
    // linear scan runs only for anchors that can actually win.
    if (bestPos > 0 && a.text.charCodeAt(bestPos) !== text.charCodeAt(bestPos)) { gateStops++; continue; }
    const L = lcp(a.text, text, limit);
    lcpWork += L;
    if (L <= bestPos) continue;
    // largest mark position <= L
    let k = -1;
    for (let m = a.n - 1; m >= 0; m--) { if (a.pos[m]! <= L) { k = m; break; } }
    if (k < 0) continue;
    const p = a.pos[k]!;
    if (p > bestPos && p >= minPrefix) {
      bestPos = p;
      best = { pos: p, total: a.total[k]!, tail: a.tail[k]!, tailTok: a.tailTok[k]! };
    }
  }
  if (best) { hits++; savedChars += bestPos; }
  return best;
}

/**
 * Record a fully counted string as an anchor, with the marks collected while it
 * was counted. `marks` is owned by the caller and is not retained.
 */
export function prolepsisRecord(text: string, enc: string, marks: ProlepsisMark[]): void {
  countedChars += text.length;
  if (prolepsisDisabled()) return;
  if (text.length > PROLEPSIS_MAX_ANCHOR_CHARS || marks.length === 0) return;
  const n = Math.min(marks.length, PROLEPSIS_MAX_MARKS);
  const a: Anchor = {
    text, enc,
    pos: new Int32Array(n), total: new Float64Array(n),
    tail: new Array<string>(n), tailTok: new Float64Array(n),
    n,
  };
  for (let i = 0; i < n; i++) {
    const m = marks[i]!;
    a.pos[i] = m.pos; a.total[i] = m.total; a.tail[i] = m.tail; a.tailTok[i] = m.tailTok;
  }
  marksMade += n;
  const cap = prolepsisAnchors();
  if (ring.length < cap) ring.push(a);
  else { ring[ringAt] = a; ringAt = (ringAt + 1) % cap; }
}

/**
 * Exactness probe, exported so a test can assert the identity on real anchors
 * instead of trusting it: with `mark` taken from any anchor,
 *     tokens(anchor.slice(0,pos) + rest) = total − tailTok + tokens(tail + rest)
 */
export function prolepsisResumeCount(
  mark: ProlepsisMark,
  rest: string,
  count: (s: string) => number,
): number {
  return mark.total - mark.tailTok + count(mark.tail + rest);
}

/** Wall-clock helper, kept so the module has no hidden dependency on `now`. */
export function prolepsisNow(): number { return now(); }
