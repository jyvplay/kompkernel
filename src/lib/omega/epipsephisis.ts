/**
 * ἘΠΙΨΉΦΙΣΙΣ (epipsēphisis — "the re-tally taken on one item", X125).
 * =============================================================================
 * Exact incremental re-pricing of a LOCALISED edit.
 *
 * WHAT IS ALREADY HERE, AND WHAT IS MISSING.
 *
 * X120 proved the exact state of a BPE marginal: with `tail(s)` the suffix of s
 * running from the start of its last NON-whitespace chunk,
 *
 *     tokens(s + p) = tokens(s) - tokens(tail(s)) + tokens(tail(s) + p)
 *
 * for every p (verified on 104 976 adversarial triples, bench/x120). X121
 * ΠΡΟΛΗΨΙΣ uses that to RESUME a fold: when the new string extends an old one,
 * the old prefix is not re-folded.
 *
 * ΠΡΡΟΛΗΨΙΣ only helps when the change is at the END. The wire optimisers do
 * not edit at the end — they edit in the MIDDLE, because that is where the rules
 * are: ΔΙΑΓΡΑΦΗ deletes one rule out of 127, ΣΤΟΙΧΗΔΟΝ moves one glyph among 62,
 * ΣΥΝΔΥΑΣΜΟΣ re-spells one letter. Every one of those candidates shares a long
 * prefix AND a long suffix with the string it was derived from, and ΠΡΟΛΗΨΙΣ
 * throws that away: measured on bench/holdout-x41/apt-real.txt (73 s), ΠΡΟΛΗΨΙΣ
 * pays 165 096 821 characters of LCP work to save 11 853 712 characters of
 * folding — 5.4 %, while the whole run folds 207 029 910 characters.
 *
 * THE THEOREM USED HERE (window re-price).
 *
 * Let T = A·B·C and T' = A·B'·C — a common prefix A, a common suffix C, and an
 * edit confined to the middle. Put ws = |A|, we = |A|+|B|, we' = |A|+|B'|. If no
 * pre-token chunk spans ws in either string, and none spans we / we', then the
 * chunk decomposition is the disjoint union of the three pieces' decompositions
 * in both strings, the pieces A and C are the same strings in both, and
 * therefore
 *
 *     tokens(T')  =  tokens(T)  -  tokens(B)  +  tokens(B')
 *
 * exactly. Pre-tokenization is a left-to-right scan in which the chunk starting
 * at x is decided by the text from x onward, so once the two cut points are
 * genuine chunk boundaries in BOTH strings, everything to their left and right
 * is decided by text the two strings share and cancels.
 *
 * FINDING A CUT THAT CANNOT BE SPANNED (this is the whole difficulty).
 *
 * A chunk can only be continued by a character its own alternative admits, and
 * the o200k pre-tokenizer's alternatives admit, after a NEWLINE, only more
 * newlines and slashes. So any position ws with
 *
 *     T[ws-1] ∈ {'\n', '\r'}   and   T[ws] ∉ whitespace ∪ {'/'}
 *
 * is a chunk boundary that no chunk can span, in T and in every other string
 * that agrees with T on [0, ws]. Both cut points are chosen that way; ws = 0 and
 * we = |T| are always admissible. X120's whitespace re-partition trap (a `\s*`
 * run swallowing the join) cannot bite here, because the trap IS a chunk
 * spanning the cut, and the rule above forbids exactly that.
 *
 * The identity is then re-checked before it is believed: a sticky scan is run
 * from ws over T' and must land exactly on we'. If it does not, the call falls
 * back to the ordinary full count. Nothing here can change a number — the worst
 * case is a miss.
 *
 * GREEDY? Yes: the newest reference is tried first and the first admissible one
 * wins. A cheaper partition of the edit may exist (an earlier cut gives a
 * shorter window); it is not searched for, because a miss costs one full count
 * and a hit already removes the whole fold.
 *
 * CPU/time: no wall-clock deadline is consulted. The probe is O(|prefix| +
 * |suffix|) character compares plus one O(|window|) fold, and it is abandoned
 * as soon as the edit exceeds MAX_EDIT characters or either cut cannot be
 * placed within CUT_SEARCH characters of the divergence.
 */

import type { EncodingName } from './bpe';

/* -------------------------------------------------------------------------- *
 * tunables — all of them only ever trade speed for speed, never for accuracy.
 * -------------------------------------------------------------------------- */

/** Only strings at least this long are worth a reference (and a probe). */
const MIN_LEN = 192;
/** The most references kept. Recency order: the newest is tried first. */
const REF_MAX = 12;
/** Total characters retained across all references. */
const REF_CHARS_MAX = 1 << 21;
/** How many references are probed before giving up. */
const PROBE_MAX = 4;
/** The largest edit (characters changed/inserted/deleted) that will be re-priced. */
const MAX_EDIT = 96;
/** How far either side of the edit the cut may be placed. */
const CUT_SEARCH = 512;
/** The largest window that will be folded instead of the whole string. */
const MAX_WINDOW = 1 << 20;
/** Characters compared per reference before the full prefix/suffix scan. */
const FILTER = 8;

interface Ref { text: string; toks: number }

/**
 * X125 SPEED VERDICT — this arm is OFF BY DEFAULT, and that is a measurement,
 * not a preference. `bench/x125/speed-ab.ts` prices all four combinations on
 * bench/holdout-x41/apt-real.txt, alternating arm order over two rounds and
 * discarding round 0 (the first encode in a process is ~4x slower than the
 * second — see the warm-up note in docs/). Warm milliseconds:
 *
 *     neither 18 438 < pro only 18 552 < epi only 20 491 < pro+epi 21 181
 *
 * All four arms produce the SAME message (M = 816, exact). So ἘΠΙΨΉΦΙΣΙΣ is
 * exact and costs ~2.05 s on an 18.44 s lane: it buys nothing and charges 11 %.
 * The reason is in the stats: 8 422 hits out of 97 634 attempts (8.6 %), and of
 * the rejections 69 % are `bigEdit` and 31 % `noPrefix` — the calls that reach
 * this code are mostly NOT the "long string, small edit near the end" shape it
 * is built for. It stays in the tree because it is the only verified-exact
 * incremental counter this stack has (bench/x125/epipsephisis-verify.ts,
 * 20 009 cases, 0 mismatches against `countTokensExact`) and because the hit
 * rate, not the window rule, is what would have to change to make it pay.
 * Opt IN with OMEGA_EPIPSEPHISIS=1.
 */
const OFF = (): boolean => {
  try {
    if (typeof process === 'undefined' || !process.env) return false;
    return process.env.OMEGA_EPIPSEPHISIS !== '1' || process.env.OMEGA_NO_EPIPSEPHISIS === '1';
  } catch { return false; }
};

const refs: Ref[] = [];
let refChars = 0;
let busy = false;

const sticky = new Map<EncodingName, RegExp>();
function stickyRe(enc: EncodingName): RegExp {
  const hit = sticky.get(enc);
  if (hit) return hit;
  // PRETOK is not exported; re-declaring the identical pattern here would risk
  // drift, so the sticky form is derived once from the shared source in bpe.
  const re = new RegExp(pretokSource(enc), 'yu');
  sticky.set(enc, re);
  return re;
}

/* The pre-tokenizer source is owned by bpe.ts; this is the one value this
 * module needs from it, and it is passed in explicitly so the two cannot drift. */
let pretokSource: (enc: EncodingName) => string = () => '';
let countFn: (text: string, enc: EncodingName) => number = () => Number.NaN;
/**
 * Wired once by bpe.ts. The dependency is injected rather than imported because
 * bpe.ts is the module that calls in here, and a cycle that runs at
 * module-evaluation time is a hazard this codec stack does not need.
 */
export function epipsephisisBind(
  src: (enc: EncodingName) => string,
  count: (text: string, enc: EncodingName) => number,
): void {
  pretokSource = src;
  countFn = count;
  sticky.clear();
}

export interface EpipsephisisLast { ref: string; text: string; lo: number; hi: number; ws: number; we: number; weN: number; lt: number; ln: number }
/** The last few successful window re-prices, kept for the differential test. */
const LAST: EpipsephisisLast[] = [];
export function epipsephisisLast(): EpipsephisisLast[] { return LAST.slice(); }

export interface EpipsephisisStats {
  refs: number; refChars: number;
  attempts: number; hits: number; rejected: number; failed: number;
  /** characters folded for the whole string minus characters folded for windows */
  savedChars: number; foldedChars: number; windowChars: number;
  /** windows that failed the sticky re-check and fell back */
  verifyFails: number;
  /** why a probe was abandoned, in evaluation order */
  noPrefix: number; noLeftCut: number; noRightCut: number; bigEdit: number; bigWindow: number;
}
const S: EpipsephisisStats = {
  refs: 0, refChars: 0, attempts: 0, hits: 0, rejected: 0, failed: 0,
  savedChars: 0, foldedChars: 0, windowChars: 0, verifyFails: 0,
  noPrefix: 0, noLeftCut: 0, noRightCut: 0, bigEdit: 0, bigWindow: 0,
};
export function epipsephisisStats(): EpipsephisisStats {
  return { ...S, refs: refs.length, refChars };
}
export function epipsephisisReset(): void {
  refs.length = 0; refChars = 0;
  S.attempts = 0; S.hits = 0; S.rejected = 0; S.failed = 0;
  S.savedChars = 0; S.foldedChars = 0; S.windowChars = 0; S.verifyFails = 0;
  S.noPrefix = 0; S.noLeftCut = 0; S.noRightCut = 0; S.bigEdit = 0; S.bigWindow = 0;
}

export function epipsephisisRecord(text: string, enc: EncodingName, toks: number): void {
  if (busy || enc !== 'o200k_base' || OFF()) return;
  if (text.length < MIN_LEN) return;
  /**
   * X125. The first version of this ran `refs.findIndex(r => r.text === text)`,
   * which is a full string compare against every reference — measured over
   * bench/holdout-x41/apt-real.txt that is ~3.7 GB of memcmp for 156 361 calls,
   * and it made the whole mechanism a 4 % net LOSS. A reference is only ever
   * consulted as a base for a later edit, so a duplicate entry would merely
   * duplicate a probe; the dedup is therefore reduced to the one case that is
   * both common and free to detect — the immediately preceding reference — and
   * even that is gated on an O(1) length test.
   */
  const last = refs.length ? refs[refs.length - 1]! : null;
  if (last !== null && last.text.length === text.length && last.text === text) { last.toks = toks; return; }
  refs.push({ text, toks });
  refChars += text.length;
  while (refs.length > REF_MAX || refChars > REF_CHARS_MAX) {
    const old = refs.shift();
    if (!old) break;
    refChars -= old.text.length;
  }
}

/**
 * Is `x` a cut that NO pre-token chunk can span?
 *
 *     cutOk(x)  <=>  exactly one of T[x-1], T[x] is a digit.
 *
 * Read off the o200k pre-tokenizer's seven alternatives:
 *
 *   - A digit can only ever appear inside `\\p{N}{1,3}`, which admits digits and
 *     nothing else. So no chunk contains a digit next to a non-digit: every
 *     non-digit neighbour of a digit ends or begins a chunk.
 *   - Conversely, a chunk running from a non-digit INTO a digit would have to
 *     admit a digit after a letter (`[\\p{L}...]+` does not), after whitespace
 *     (` ?[^\\s\\p{L}\\p{N}]+`, `\\s*`, `\\s+` do not), or after punctuation
 *     (`[\\r\\n/]*` admits only newlines and slashes, and the "other" class
 *     excludes `\\p{N}`).
 *
 * Measured, not only argued (bench/x125/pairs.ts, over the 29 lanes, the 29
 * shipped wires and 3 000 synthetic strings on an adversarial alphabet; the
 * pattern covered every text). Of the sixteen class pairs exactly six are never
 * observed inside a chunk, and they are precisely the six in which exactly one
 * side is a digit:
 *
 *     L->N  N->L  N->S  N->P  S->N  P->N        never spanned (refused: none)
 *     L->L  L->S  L->P  N->N  S->L  S->S
 *     S->P  P->L  P->S  P->P                    spanned, refused
 *
 * (L = letter or mark, N = digit, S = whitespace, P = everything else.) The
 * apostrophe is the trap behind L->P — `(?:'(?:[sStT]|[rR][eE]|...))?` lets a
 * chunk continue past `x'` — and L->S has 179 counter-examples of its own in the
 * corpus. Refusing a pair that would have been safe costs one full count;
 * accepting one that is not safe would cost the codec, so the table used here is
 * the measured one rather than the hoped-for one.
 */
const RE_N = /\p{N}/u;
function isDigit(t: string, x: number): boolean {
  const c = t.charCodeAt(x);
  if (c < 128) return c >= 0x30 && c <= 0x39;
  return RE_N.test(t[x]!);
}
const RE_S = /\s/u;
function isSpace(t: string, x: number): boolean {
  const c = t.charCodeAt(x);
  if (c < 128) return c === 0x20 || (c >= 0x09 && c <= 0x0d);
  return RE_S.test(t[x]!);
}
function cutOk(t: string, x: number): boolean {
  if (x <= 0 || x >= t.length) return false;
  return isDigit(t, x - 1) !== isDigit(t, x);
}

/**
 * Scan the window [from, to) of `t` with the sticky pre-tokenizer and report
 * whether the chunks tile it exactly, and whether the LAST chunk is a
 * whitespace-only one.
 *
 * The last-chunk question is not cosmetic. `\s+(?!\S)` is the only alternative
 * with a lookahead, and a lookahead reads the character AFTER the chunk — which
 * the substring does not have. Measured on the corpus (bench/x125, the case that
 * broke the first implementation):
 *
 *     T = "...507G  161G  149G  63% /mnt/vol11"
 *     chunks of T inside the window  = ["161","G"," "," ","149","G"," "," "]
 *     chunks of the window alone     = ["161","G"," "," ","149","G","  "]
 *
 * The trailing run "  " is TWO chunks when a non-space follows it (the lookahead
 * makes `\s+` give back its last space) and ONE chunk when the string ends. So a
 * window that ends in whitespace prices differently alone than it does in place,
 * and a cut is only admitted when the window does not end in a whitespace chunk.
 */
const WS_CHUNK = /^\s+$/u;
function scanWindow(t: string, from: number, to: number, re: RegExp): { ok: boolean; lastWs: boolean } {
  let p = from;
  let lastStart = from;
  re.lastIndex = p;
  let guard = 0;
  while (p < to) {
    if (++guard > MAX_WINDOW) return { ok: false, lastWs: false };
    const m = re.exec(t);
    if (m === null || m.index !== p) return { ok: false, lastWs: false };
    const len = m[0].length;
    if (len === 0) return { ok: false, lastWs: false };
    lastStart = p;
    p += len;
    if (p > to) return { ok: false, lastWs: false };
    re.lastIndex = p;
  }
  if (p !== to) return { ok: false, lastWs: false };
  return { ok: true, lastWs: from < to && WS_CHUNK.test(t.slice(lastStart, to)) };
}

/**
 * Re-price `text` from the newest reference that differs from it only inside a
 * bounded window. Returns null when no such reference exists, when the cut
 * cannot be placed, or when the sticky re-check fails.
 */
export function epipsephisisTry(text: string, enc: EncodingName): number | null {
  if (busy || enc !== 'o200k_base' || OFF()) return null;
  if (text.length < MIN_LEN || refs.length === 0) return null;
  S.attempts++;
  const n = refs.length;
  let probed = 0;
  for (let k = n - 1; k >= 0 && probed < PROBE_MAX; k--, probed++) {
    const r = refs[k]!;
    const T = r.text;
    if (T === text) continue;
    const lt = T.length, ln = text.length;
    // cheap reject: a few characters at each end
    let ok = true;
    for (let i = 0; i < FILTER; i++) {
      if (T.charCodeAt(i) !== text.charCodeAt(i)) { ok = false; break; }
      if (T.charCodeAt(lt - 1 - i) !== text.charCodeAt(ln - 1 - i)) { ok = false; break; }
    }
    if (!ok) { S.rejected++; S.noPrefix++; continue; }

    // common prefix / common suffix
    const m = Math.min(lt, ln);
    let pl = 0;
    while (pl < m && T.charCodeAt(pl) === text.charCodeAt(pl)) pl++;
    let sl = 0;
    while (sl < m - pl && T.charCodeAt(lt - 1 - sl) === text.charCodeAt(ln - 1 - sl)) sl++;

    const lo = pl;                 // first differing position in T
    const hi = lt - sl;            // last differing position in T (exclusive)
    if (hi - lo > MAX_EDIT) { S.rejected++; S.bigEdit++; continue; }

    // Left cut. It must lie STRICTLY inside the common prefix (ws < lo), because
    // the no-span argument reads T[ws-1] and T[ws] and needs both of those
    // characters to be the same in T'. (ws === 0 is always admissible: there is
    // no character to the left to continue a chunk.)
    let ws = -1;
    if (lo === 0) ws = 0;
    else {
      const from = Math.max(1, lo - CUT_SEARCH);
      for (let x = lo - 1; x >= from; x--) if (cutOk(T, x)) { ws = x; break; }
    }
    if (ws < 0) { S.rejected++; S.noLeftCut++; continue; }

    // Right cut. Two conditions, both about the character BEFORE the cut:
    //   (1) cutOk, as on the left — both characters must sit inside the common
    //       suffix, hence we >= hi + 1 (or the very end of the string);
    //   (2) T[we-1] must not be whitespace. A window that ends in whitespace
    //       ends in a whitespace-only chunk, and `\s+(?!\S)` prices such a chunk
    //       differently alone than it does in place — see scanWindow. Skipping
    //       those candidates here, instead of rejecting them after the scan,
    //       turns most of them into a hit one cut further right.
    let we = -1;
    const until = Math.min(lt, hi + CUT_SEARCH);
    for (let x = hi + 1; x <= until; x++) {
      if (x === lt || (cutOk(T, x) && !isSpace(T, x - 1))) { we = x; break; }
    }
    if (we < 0) { S.rejected++; S.noRightCut++; continue; }
    if (we - ws > MAX_WINDOW) { S.rejected++; S.bigWindow++; continue; }

    const weN = we + (ln - lt);
    LAST.push({ ref: T, text, lo, hi, ws, we, weN, lt, ln });
    if (LAST.length > 4) LAST.shift();
    if (weN > ln || weN < 0) { S.rejected++; continue; }

    // The cut must be defensible in the NEW string too: it is, because both cuts
    // sit inside the identical prefix/suffix and the rule forbids spanning.
    // Assert it anyway — a failed assertion costs one full count, a wrong number
    // would cost the whole codec.
    const re = stickyRe(enc);
    busy = true;
    let out: number | null = null;
    try {
      const B = T.slice(ws, we);
      const Bn = text.slice(ws, weN);
      const scT = scanWindow(T, ws, we, re);
      const scN = scanWindow(text, ws, weN, re);
      if (!scT.ok || !scN.ok || scT.lastWs || scN.lastWs) {
        S.verifyFails++;
      } else {
        const cb = countFn(B, enc);
        const cbn = countFn(Bn, enc);
        const got = r.toks - cb + cbn;
        if (Number.isFinite(got) && got >= 0) {
          out = got;
          S.hits++;
          S.savedChars += lt - (we - ws);
          S.windowChars += (we - ws) + (weN - ws);
          S.foldedChars += lt;
        }
      }
    } finally {
      busy = false;
    }
    if (out !== null) return out;
    S.failed++;
    return null;
  }
  return null;
}
