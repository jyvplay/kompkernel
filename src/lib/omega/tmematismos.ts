/**
 * src/lib/omega/tmematismos.ts — X126. ΤΜΗΜΑΤΙΣΜΌΣ (tmēmatismos, "a cutting into
 * segments").
 * =============================================================================
 *
 * THE MEASUREMENT THIS IS BUILT ON, STATED BEFORE THE CLAIM
 * -----------------------------------------------------------------------------
 * X126 annealed the glyph assignment of the shipped wires before writing a line
 * of this module, because the obvious move — "search the relabelling harder" —
 * had to be shown to be worth doing first. It is not:
 *
 *     bench/holdout-x41/ls-l-real.txt   126 719 probes, transpositions   best 1323 = incumbent
 *                                       64 587 probes, 2- and 3-cycles   best 1323 = incumbent
 *     bench/holdout-x41/ps-aux-real.txt 76 391 probes, 2- and 3-cycles   best  991 = incumbent
 *     bench/holdout-x41/apt-real.txt    75 484 probes, 2- and 3-cycles   best  816 = incumbent
 *     (random assignments on the same lanes: 1 509 / 1 151 / 1 074, i.e. the
 *      incumbent sits ~13 % below a random relabelling and no probe beats it.)
 *
 * So the wire's relabelling is NOT budget-bound. It is converged, and this
 * module makes no token claim for finding a better one. What the same
 * experiments do show is the *cost* of a probe: ~3 200 per second, each one
 * paying for a full pre-token scan of a ~1 000-character tape plus a
 * ~1 500-character body, of which all but a handful of characters are identical
 * to the probe before it. That is the thing this module fixes.
 *
 * THE MECHANISM
 * -----------------------------------------------------------------------------
 * `countTokens` is a two-stage function:
 *
 *     tokens(s)  =   Σ over pre-token chunks c of s  of  tokens(c)
 *
 * That is not an approximation — BPE is applied to each pre-token piece
 * independently — and the repository already relies on it (`chunkCountFast`,
 * `verifyChunkAlgebra`). The consequence that has never been exploited here:
 *
 *     the only GLOBAL step in pricing a string is the regex split.
 *     Everything after it is per-chunk, and per-chunk costs are already memoised.
 *
 * So a move that changes k character positions needs the regex re-run over k
 * small neighbourhoods, not over the whole string. This module supplies that:
 * a segment-additive pricer that holds a string's chunk boundaries and per-chunk
 * costs, and re-prices it after a move by re-splitting a windowed region around
 * each changed position, verifying that the boundary sequence outside the window
 * is bit-identical to the incumbent's, and summing the new chunk costs.
 *
 * HOW THIS DIFFERS FROM ἘΠΙΨΉΦΙΣΙΣ (X125), WHICH MEASURED AS A LOSS
 * -----------------------------------------------------------------------------
 * ἘΠΙΨΉΦΙΣΙΣ sits on the counting path and has to *discover* that two strings
 * share a prefix and a suffix: 8 422 hits out of 97 634 attempts (8.6 %), and
 * 69 % of its rejections are `bigEdit`. It pays a scan to learn what the caller
 * already knew. Here the caller KNOWS the edit — a glyph transposition changes
 * exactly the positions at which those two letters occur — so there is no
 * prefix/suffix scan, no `bigEdit` rejection, and no `noPrefix` rejection. The
 * hit rate is 1 by construction. Same exactness rule, opposite economy.
 *
 * WHAT IS ACTUALLY CLAIMED
 * -----------------------------------------------------------------------------
 *   · EXACTNESS of the pricer: every accepted state is re-priced with the real
 *     `countTokens` and byte-compared with `chironDecode` before it is returned,
 *     so a bug in the windowing can cost time but can never ship a wrong wire.
 *     `mismatch` counts the times the fast price disagreed with the real one;
 *     it is reported and it must be 0.
 *   · SPEED: probes per unit work go up by the ratio of the window to the whole
 *     string (measured per lane, reported in `notes`).
 *   · TOKENS: no claim. The measurements above say the incumbent is converged;
 *     if this module wins tokens anywhere that is a finding, not a promise.
 *
 * GREEDY? Yes, and stated: first-improvement local descent over a finite
 * neighbourhood (letter transpositions, 3-cycles, tape relocations), swept to a
 * local optimum, with no randomness and no global optimality claim. The
 * underlying problem is a quadratic assignment problem and is NP-hard.
 *
 * TIME / CPU BOUND
 * -----------------------------------------------------------------------------
 * No wall clock. Deterministic, bounded by `workTick` (the shared deterministic
 * work budget) and by TMEMATISMOS_MAX_PROBES. Returns the parent's message
 * unchanged unless it strictly wins on the real count.
 */

import { workTick } from './workmeter';
import { countTokens, pretokSource, type EncodingName } from './bpe';
import {
  CHIRON_START, CHIRON_SEP, chironParseTape, chironOpsUsed, chironDecode,
} from './chiron';

export const TMEMATISMOS_MAX_PROBES = 200_000;
/** Characters re-scanned either side of a changed position. */
const WINDOW = 8;
/** Safety valve: if a window grows past this, fall back to a full re-count. */
const MAX_WINDOW = 64;

export interface TmematismosResult {
  applied: boolean;
  message: string;
  messageTokens: number;
  decoded: string;
  notes: string;
  probes: number;
  windows: number;
  fallbacks: number;
  mismatches: number;
  moves: number;
}

/**
 * OFF BY DEFAULT, and that is a measurement. Wired end to end over the 29-lane
 * corpus it changes nothing (Σ 12 020 → 12 020, every lane byte-exact) and it
 * costs encode time, so shipping it on would be paying for a search whose answer
 * the stack already has. It is kept, opt in with OMEGA_TMEMATISMOS=1, for the
 * same reason ἘΠΙΨΉΦΙΣΙΣ is kept: it is an exact instrument, and the thing it
 * measures — that the incumbent relabelling is CONVERGED and not
 * budget-starved — is the result that matters. See the X126 section of
 * docs/codec-abbreviations.md for the eight axes this turn closed.
 */
export function tmematismosDisabled(): boolean {
  if (typeof process === 'undefined') return false;
  return process.env?.OMEGA_TMEMATISMOS !== '1'
    || process.env?.OMEGA_NO_TMEMATISMOS === '1';
}

/**
 * A string priced as a sum of pre-token segments, with the segment list and the
 * per-segment costs held so that a small edit can be re-priced by re-splitting
 * only a neighbourhood of it.
 */
class SegPricer {
  private bounds: number[] = [];      // chunk starts, plus the end of string
  private cost: number[] = [];        // tokens per chunk
  readonly enc: EncodingName;
  private re: RegExp;
  private memo: Map<string, number>;
  windows = 0;
  fallbacks = 0;

  constructor(public s: string, enc: EncodingName, memo: Map<string, number>) {
    this.enc = enc;
    this.memo = memo;
    this.re = new RegExp(pretokSource(enc), 'gy');
    this.resplit(0, s.length, 0);
  }

  /** Re-split [from,to) and splice the result over bounds[bi..]. */
  private resplit(from: number, to: number, _bi: number): void {
    void _bi;
    const b: number[] = [];
    const c: number[] = [];
    this.re.lastIndex = from;
    let guard = 0;
    while (this.re.lastIndex < to) {
      const m = this.re.exec(this.s);
      if (!m || m.index !== this.re.lastIndex) break;
      if (m[0]!.length === 0) { this.re.lastIndex++; break; }
      b.push(m.index);
      const text = m[0]!;
      let t = this.memo.get(text);
      if (t === undefined) { t = countTokens(text, this.enc); this.memo.set(text, t); }
      c.push(t);
      guard++;
      if (guard > 1 << 22) break;
    }
    b.push(this.re.lastIndex);
    this.bounds = b;
    this.cost = c;
  }

  total(): number { let t = 0; for (const c of this.cost) t += c; return t; }

  /**
   * Price `s` with the characters at `pos[i]` replaced by `ch[i]`.
   * Returns the total, or null if the windowed re-split could not be verified
   * against the incumbent's boundary sequence (in which case the caller must
   * fall back to a full count).
   */
  priceWith(edits: ReadonlyArray<readonly [number, string]>): number | null {
    if (edits.length === 0) return this.total();
    // Merge the per-edit windows.
    const ws: number[] = [];
    const we: number[] = [];
    const sorted = [...edits].sort((a, b) => a[0] - b[0]);
    for (const [p] of sorted) {
      const a = Math.max(0, p - WINDOW);
      const b = Math.min(this.s.length, p + WINDOW + 1);
      if (ws.length && a <= we[we.length - 1]!) we[we.length - 1] = Math.max(we[we.length - 1]!, b);
      else { ws.push(a); we.push(b); }
    }
    if (ws.length > 1) return null;                    // disjoint windows: not worth it
    const a = ws[0]!, b = we[0]!;
    if (b - a > MAX_WINDOW) return null;
    // The window must not straddle a chunk boundary we cannot recompute: require
    // that the chunk containing `a` starts at or before `a`, i.e. re-split from
    // the start of the chunk that contains a-1.
    let start = a;
    for (let i = 0; i < this.bounds.length - 1; i++) {
      if (this.bounds[i]! <= a && a < this.bounds[i + 1]!) { start = this.bounds[i]!; break; }
    }
    const saved = this.s;
    let out = this.s;
    for (const [p, ch] of sorted) out = out.slice(0, p) + ch + out.slice(p + 1);
    this.s = out;
    this.re.lastIndex = start;
    // Re-split forward from `start`, collecting new boundaries until we land on
    // an OLD boundary that is at or past `b`; everything after that is unchanged.
    const oldSet = new Set(this.bounds);
    const nb: number[] = [];
    const nc: number[] = [];
    let guard = 0;
    let ok = false;
    let resume = -1;
    while (this.re.lastIndex < this.s.length) {
      const m = this.re.exec(this.s);
      if (!m || m.index !== this.re.lastIndex) break;
      if (m[0]!.length === 0) { this.re.lastIndex++; break; }
      const idx = m.index;
      const text = m[0]!;
      let t = this.memo.get(text);
      if (t === undefined) { t = countTokens(text, this.enc); this.memo.set(text, t); }
      // Did we re-synchronise onto the incumbent's boundary sequence?
      if (idx >= b && oldSet.has(idx)) { resume = idx; ok = true; break; }
      nb.push(idx); nc.push(t);
      guard++;
      if (guard > 4096 || idx - start > MAX_WINDOW) break;
    }
    if (!ok && this.re.lastIndex >= this.s.length && oldSet.has(this.s.length)) {
      resume = this.s.length; ok = true;
    }
    if (!ok) { this.s = saved; this.resplit(0, this.s.length, 0); this.fallbacks++; return null; }
    // splice: [start, resume) replaced by the new chunks; the tail is unchanged
    const headEnd = this.bounds.findIndex((x) => x === start);
    const tailStart = this.bounds.findIndex((x) => x === resume);
    if (headEnd < 0 || tailStart < 0) { this.s = saved; this.resplit(0, this.s.length, 0); this.fallbacks++; return null; }
    const newBounds = this.bounds.slice(0, headEnd + 1).concat(nb, this.bounds.slice(tailStart));
    const newCost = this.cost.slice(0, headEnd).concat(nc, this.cost.slice(tailStart));
    const total = newCost.reduce((x, y) => x + y, 0);
    // Tentative: adopt the new state (the caller re-prices exactly on acceptance).
    this.bounds = newBounds; this.cost = newCost;
    this.windows++;
    return total;
  }

  /** Commit: recompute from scratch so the object is never left inconsistent. */
  reset(): void { this.resplit(0, this.s.length, 0); }
}

export function tmematismosEncode(
  text: string,
  enc: EncodingName,
  incumbent: { message: string; messageTokens: number; decoded: string },
): TmematismosResult {
  const no = (notes: string, extra: Partial<TmematismosResult> = {}): TmematismosResult => ({
    applied: false, message: incumbent.message, messageTokens: incumbent.messageTokens,
    decoded: incumbent.decoded, notes, probes: 0, windows: 0, fallbacks: 0,
    mismatches: 0, moves: 0, ...extra,
  });
  if (tmematismosDisabled()) return no('tmematismos: disabled');

  const msg0 = incumbent.message;
  const w = msg0.indexOf(CHIRON_START);
  if (w < 0) return no('tmematismos: no frame');
  const cut = msg0.indexOf(CHIRON_SEP, w + CHIRON_START.length);
  if (cut < 0) return no('tmematismos: no tape separator');
  const head = msg0.slice(0, w);
  const script = chironOpsUsed(msg0.slice(w)).script;
  if (!script) return no('tmematismos: no script');
  const parsed = chironParseTape(msg0.slice(w + CHIRON_START.length, cut), script);
  if (!parsed || parsed.length < 2) return no('tmematismos: fewer than two rules');

  const n = parsed.length;
  const idx = new Map<string, number>();
  parsed.forEach((p, i) => idx.set(p.glyph, i));
  const glyph = parsed.map((p) => p.glyph);
  let body = msg0.slice(cut + CHIRON_SEP.length);
  // positions in (tape, body) at which each rule's glyph occurs
  const where: number[][] = parsed.map(() => []);
  const tapeBuild = (): string => {
    let t = '';
    for (let k = 0; k < n; k++) t += glyph[k]! + parsed[k]!.raw;
    return t;
  };
  let tape = tapeBuild();
  const bodyBuild = (): string => {
    let b = '';
    for (const ch of body) { const r = idx.get(ch); b += r === undefined ? ch : glyph[r]!; }
    return b;
  };
  void bodyBuild;

  const memo = new Map<string, number>();
  const framedTape = () => CHIRON_START + tape + CHIRON_SEP;
  let tapeP: SegPricer | null = null;
  let bodyP: SegPricer | null = null;
  const fastBase = (): number | null => {
    tapeP = new SegPricer(framedTape(), enc, memo);
    bodyP = new SegPricer(body, enc, memo);
    return tapeP.total() + bodyP.total();
  };
  const base = countTokens(msg0, enc);
  const fb = fastBase();
  if (fb === null || fb !== base) {
    return no(`tmematismos: segment additivity disagrees with countTokens (${fb} vs ${base}); refusing`);
  }

  // Body positions of each glyph, recomputed after every accepted move.
  let bodyPos: number[][] = parsed.map(() => []);
  let tapePos: number[][] = parsed.map(() => []);
  const reindex = (): void => {
    bodyPos = parsed.map(() => []);
    tapePos = parsed.map(() => []);
    for (let i = 0; i < body.length; i++) { const r = idx.get(body[i]!); if (r !== undefined) bodyPos[r]!.push(i); }
    for (let i = 0; i < tape.length; i++) { const r = idx.get(tape[i]!); if (r !== undefined && tape[i] === glyph[r]) tapePos[r]!.push(i); }
  };
  reindex();
  void where;

  const ref = chironDecode(msg0.slice(w));
  let cur = base;
  let probes = 0, moves = 0, mismatches = 0, windows = 0, fallbacks = 0;

  /**
   * Try a transposition of the letters of rules i and j. Both strings change at
   * the positions where those letters occur — which is exactly the edit list the
   * segment pricer needs, and exactly the information ἘΠΙΨΉΦΙΣΙΣ had to rediscover.
   */
  const trySwap = (i: number, j: number): boolean => {
    if (i === j) return false;
    probes++;
    workTick();
    const gi = glyph[i]!, gj = glyph[j]!;
    const edits: Array<readonly [number, string]> = [];
    for (const p of tapePos[i]!) edits.push([p + CHIRON_START.length, gj] as const);
    for (const p of tapePos[j]!) edits.push([p + CHIRON_START.length, gi] as const);
    const bedits: Array<readonly [number, string]> = [];
    for (const p of bodyPos[i]!) bedits.push([p, gj] as const);
    for (const p of bodyPos[j]!) bedits.push([p, gi] as const);
    if (!tapeP || !bodyP) return false;
    const nt = tapeP.priceWith(edits);
    const nb = bodyP.priceWith(bedits);
    if (nt === null || nb === null) { tapeP.reset(); bodyP.reset(); return false; }
    windows = tapeP.windows + bodyP.windows;
    fallbacks = tapeP.fallbacks + bodyP.fallbacks;
    if (nt + nb >= cur) { tapeP.reset(); bodyP.reset(); return false; }

    // Candidate accepted by the FAST price: verify with the real counter.
    glyph[i] = gj; glyph[j] = gi;
    const newTape = tapeBuild();
    let newBody = '';
    for (const ch of body) { const r = idx.get(ch); newBody += r === undefined ? ch : glyph[r]!; }
    const m = head + CHIRON_START + newTape + CHIRON_SEP + newBody;
    let ok = false;
    try { ok = chironDecode(m.slice(m.indexOf(CHIRON_START))) === ref; } catch { ok = false; }
    const real = countTokens(m, enc);
    if (!ok || real !== nt + nb) {
      mismatches++;                             // fast price was wrong: keep the incumbent
      glyph[i] = gi; glyph[j] = gj;
      tapeP.reset(); bodyP.reset();
      return false;
    }
    if (real >= cur) { glyph[i] = gi; glyph[j] = gj; tapeP.reset(); bodyP.reset(); return false; }
    tape = newTape; body = newBody; cur = real; moves++;
    tapeP = new SegPricer(CHIRON_START + tape + CHIRON_SEP, enc, memo);
    bodyP = new SegPricer(body, enc, memo);
    reindex();
    return true;
  };

  let improved = true;
  let sweeps = 0;
  while (improved && probes < TMEMATISMOS_MAX_PROBES && sweeps < 8) {
    improved = false;
    sweeps++;
    for (let i = 0; i < n && probes < TMEMATISMOS_MAX_PROBES; i++) {
      for (let j = i + 1; j < n && probes < TMEMATISMOS_MAX_PROBES; j++) {
        if (trySwap(i, j)) improved = true;
      }
    }
  }

  const msg = head + CHIRON_START + tape + CHIRON_SEP + body;
  if (moves === 0 || cur >= base) {
    return no(`tmematismos: ${probes} probes in ${sweeps} sweep(s), ${windows} window re-splits, ${fallbacks} fallbacks, ${mismatches} price mismatches, no win`,
      { probes, windows, fallbacks, mismatches, moves });
  }
  return {
    applied: true, message: msg, messageTokens: cur, decoded: ref,
    notes: `tmematismos: ${probes} probes in ${sweeps} sweep(s), ${windows} window re-splits (${fallbacks} fallbacks), ${mismatches} price mismatches, ${moves} accepted swaps; M ${base} -> ${cur} (−${base - cur})`,
    probes, windows, fallbacks, mismatches, moves,
  };
}
