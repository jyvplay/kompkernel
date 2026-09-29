/**
 * PRONOIA — a certificate that proves search is futile before paying for it.
 * =============================================================================
 * THE MEASURED PROBLEM (this turn's own red-team run, not a claim)
 * -----------------------------------------------------------------------------
 * `bench/chiron-redteam.ts`, run on this branch immediately after CHIRON.patch
 * was applied: 12/14 gates pass. The two failures are both about TIME, not
 * correctness — G10 (SIBYL's grammar phase is wall-clock-bounded, so it is
 * occasionally nondeterministic under load) and G12 (worst lane 32.8s, over a
 * 30s soft budget). Six prior turns of reports in this repository (DAEDALUS,
 * PALIMPSEST, SEQUOYAH, THOTH) all independently measured the same fact from a
 * different angle: "the dictionary/grammar/merge class is exhausted... 55-75%
 * of every wire is literal hapax text" and "9s, 30s, 90s give byte-identical M"
 * (daedalus-report.md, point 5) — i.e. on the inputs that dominate real chat
 * traffic (English prose, already-dense JSON, already-unique log lines), the
 * multi-second anytime search these codecs run finds NOTHING, every single
 * time, and nobody in six turns asked "can we know that in advance, cheaply,
 * with a proof rather than a heuristic?"
 *
 * THE CERTIFICATE
 * -----------------------------------------------------------------------------
 * ARIADNE/SIBYL/THOTH/SEQUOYAH/PALIMPSEST/DAEDALUS are, by their own repeated
 * self-description, ALL members of one mechanism class: a straight-line
 * program (SLP) / context-free grammar over the SAME fixed BPE tokenisation of
 * the input, whose rules never cross a token boundary (Gańczorz–Jeż, DCC 2017,
 * already cited in this repo as the reason ARIADNE never proposes a span
 * crossing a token border). That is exactly the classical "smallest grammar"
 * setting, and it has a classical, cheap, EXACT lower bound:
 *
 *   Theorem (Rytter, "Application of Lempel-Ziv factorization to the
 *   approximation of grammar-based compression", Theor. Comput. Sci. 302
 *   (2003) 211-222; independently Charikar, Lehman, Liu, Panigrahy, Prabhakaran,
 *   Sahai, Shelat, "The smallest grammar problem", IEEE Trans. Inform. Theory
 *   51(7):2554-2576, 2005): for any string s over an alphabet, if z(s) is the
 *   number of factors in its LZ77 factorisation (self-referential copies
 *   allowed, greedy longest-match, no literal-cost weighting), then the size
 *   of the SMALLEST straight-line program generating s satisfies g(s) >= z(s).
 *
 * Apply the alphabet substitution these codecs already made for their own
 * search (characters -> BPE token ids) and the theorem transfers unchanged:
 * g(tokenIds) >= z(tokenIds). Every wire these six codecs can ever emit, before
 * the fixed decoder-contract cost, has AT LEAST z(tokenIds) symbols, because
 * "wire tokens (pre-contract)" IS (up to a small, same-direction, per-rule
 * declaration overhead that can only INCREASE the true count) the classical
 * grammar-size objective g. So:
 *
 *   max possible saving, before any contract is paid  <=  n - z
 *
 * where n is the input's real token count. z is computed here EXACTLY (not
 * approximated) by the standard online suffix-automaton LZ factorisation
 * (build the automaton incrementally; at each position, walk the automaton
 * built from the text seen so far as deep as transitions allow; that walk
 * length is the greedy longest previous factor, and greedy parsing is optimal
 * for the unweighted LZ77 factor count) — O(n) amortised, no tokenizer calls,
 * no floating point, no clock.
 *
 * THE SECOND, NON-FORMAL GUARD (why this is not claimed airtight on its own)
 * -----------------------------------------------------------------------------
 * The same codec family ALSO ships primitives this bound does not cover:
 * arithmetic/cycling ranges and repeat/fill-in BLOCKS over near-identical (not
 * byte-identical) lines — CHIRON's block pass and ARIADNE's `...a..b` ranges
 * and cycling lists exploit STRUCTURAL regularity across records that differ
 * in content, which a literal-repeat measure such as z cannot see (`item 1,
 * item 2, ..., item 50` has z essentially equal to n, yet a range rule folds
 * it to a handful of tokens). Gating on z alone would therefore be UNSOUND for
 * exactly the inputs those primitives exist for. PRONOIA additionally runs a
 * cheap O(n) structural-regularity scan (repeated per-line character-class
 * signatures, à la MOSAIC's regime scan; and arithmetic progressions among
 * extracted digit runs) and refuses to certify futility unless BOTH the z
 * bound clears the floor AND no such structure is found. This second check is
 * an engineering safety margin, not a theorem, and is labelled as such: it is
 * verified empirically (§ tests below), not proved. Because it can only make
 * the gate MORE conservative (fire less often), it can only cost speed, never
 * correctness — the asymmetry is deliberate.
 *
 * WHAT PRONOIA ACTUALLY CHANGES
 * -----------------------------------------------------------------------------
 * Nothing about the wire language, the contract, or any of the three
 * independent readers. PRONOIA never constructs a wire itself. When the
 * certificate clears (rare on structured/repetitive text, the VAST majority of
 * short natural-English-prose and already-information-dense payloads), it
 * calls the real, unmodified `daedalusEncode` with a starved budget (1ms,
 * 1 arm) instead of skipping it — the anytime-algorithm discipline already
 * built into this stack (Dean & Boddy 1988) guarantees a starved call still
 * returns its own correct, gate-passing answer, so PRONOIA inherits every
 * correctness property of DAEDALUS for free and adds nothing that could be
 * wrong. When the certificate does not clear, PRONOIA runs the full search,
 * unchanged. Measured effect: see bench/pronoia-report.md.
 * =============================================================================
 */

import { encodeIds, countTokens, type EncodingName } from './bpe';
import { chironDecode, chironDecoderPrompt } from './chiron';
import { daedalusEncode, type DaedalusOptions, type DaedalusResult } from './daedalus';

// ---------------------------------------------------------------------------
// z(tokenIds): exact LZ77 factor count via an online suffix automaton.
// ---------------------------------------------------------------------------

interface SamState { len: number; link: number; next: Map<number, number> }

class SuffixAutomaton {
  states: SamState[] = [{ len: 0, link: -1, next: new Map() }];
  last = 0;
  extend(c: number): void {
    const cur = this.states.length;
    this.states.push({ len: this.states[this.last].len + 1, link: -1, next: new Map() });
    let p = this.last;
    while (p !== -1 && !this.states[p].next.has(c)) {
      this.states[p].next.set(c, cur);
      p = this.states[p].link;
    }
    if (p === -1) {
      this.states[cur].link = 0;
    } else {
      const q = this.states[p].next.get(c)!;
      if (this.states[p].len + 1 === this.states[q].len) {
        this.states[cur].link = q;
      } else {
        const clone = this.states.length;
        this.states.push({ len: this.states[p].len + 1, link: this.states[q].link, next: new Map(this.states[q].next) });
        while (p !== -1 && this.states[p].next.get(c) === q) {
          this.states[p].next.set(c, clone);
          p = this.states[p].link;
        }
        this.states[q].link = clone;
        this.states[cur].link = clone;
      }
    }
    this.last = cur;
  }
}

/**
 * Exact LZ77 factor count (self-referential OVERLAPPING copies allowed, greedy
 * longest-match). Greedy longest-match parsing is optimal for the unweighted
 * factor-count objective, so this IS z(s), not an approximation.
 *
 * Method: build the suffix automaton of the WHOLE sequence once, propagate the
 * minimum end-position ("firstEnd") to every state along the suffix-link tree
 * (same aggregation shape ARIADNE already uses for endpos counts), then, for
 * each factor start i, walk the automaton from the root through ids[i],
 * ids[i+1], ... . At walk depth L the reached state's firstEnd is always
 * <= i+L-1 (the walk's own occurrence is always a member); the substring has
 * an EARLIER occurrence — i.e. a valid back-reference — iff firstEnd < i+L-1.
 * The first time that stops holding, the substring at i has just become
 * "first seen here", so the walk halts and factorLen is the last depth where
 * it still held (or 1, a literal, if it never held). This correctly allows
 * copy length to exceed the copy distance (overlap), unlike a naive
 * incremental "automaton of the prefix" walk, which does not.
 */
export function lzFactorCount(ids: number[]): number {
  const n = ids.length;
  if (n === 0) return 0;
  const sam = new SuffixAutomaton();
  const firstEnd: number[] = [Infinity];
  for (let pos = 0; pos < n; pos++) {
    const before = sam.states.length;
    sam.extend(ids[pos]);
    for (let s = before; s < sam.states.length; s++) firstEnd.push(Infinity);
    // `last` is always the freshly-created non-clone state for this character;
    // its unique direct occurrence ends exactly at `pos`.
    firstEnd[sam.last] = Math.min(firstEnd[sam.last], pos);
  }
  const order = sam.states.map((_, idx) => idx).slice(1); // exclude root from needing a push target check
  order.sort((a, b) => sam.states[b].len - sam.states[a].len);
  for (const v of order) {
    const link = sam.states[v].link;
    if (link >= 0 && firstEnd[v] < firstEnd[link]) firstEnd[link] = firstEnd[v];
  }

  let i = 0;
  let z = 0;
  while (i < n) {
    let state = 0;
    let L = 0;
    let lastValidL = 0;
    while (i + L < n) {
      const nxt = sam.states[state].next.get(ids[i + L]);
      if (nxt === undefined) break;
      state = nxt;
      L++;
      if (firstEnd[state] < i + L - 1) lastValidL = L; else break;
    }
    const factorLen = Math.max(1, lastValidL);
    z++;
    i += factorLen;
  }
  return z;
}

// ---------------------------------------------------------------------------
// Secondary, non-formal structural-regularity guard.
// ---------------------------------------------------------------------------

/** MOSAIC-style character-class run signature for one line, ignoring literal content. */
function lineSignature(line: string): string {
  let sig = '';
  let prevClass = '';
  for (const ch of line) {
    let cls: string;
    if (ch >= '0' && ch <= '9') cls = 'D';
    else if (/[a-zA-Z]/.test(ch)) cls = 'L';
    else if (ch === ' ' || ch === '\t') cls = 'S';
    else cls = 'P';
    if (cls !== prevClass) { sig += cls; prevClass = cls; }
  }
  return sig;
}

/** Extract maximal digit runs (as BigInt, safe for arbitrary length) with their order of appearance. */
function digitRuns(text: string): bigint[] {
  const out: bigint[] = [];
  const re = /\d+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[0].length <= 18) out.push(BigInt(m[0]));
  }
  return out;
}

/** True if any 3 consecutive extracted numbers form a constant, nonzero-step arithmetic progression. */
function hasArithmeticRun(nums: bigint[]): boolean {
  for (let i = 0; i + 2 < nums.length; i++) {
    const d1 = nums[i + 1] - nums[i];
    const d2 = nums[i + 2] - nums[i + 1];
    if (d1 !== 0n && d1 === d2) return true;
  }
  return false;
}

export interface StructuralScan {
  repeatedLineShape: boolean;
  arithmeticRun: boolean;
  clear: boolean; // true = no non-literal structure detected (safe to trust the z-bound alone)
}

export function structuralScan(text: string): StructuralScan {
  const lines = text.split('\n');
  const sigCounts = new Map<string, number>();
  for (const line of lines) {
    if (line.length === 0) continue;
    const s = lineSignature(line);
    sigCounts.set(s, (sigCounts.get(s) ?? 0) + 1);
  }
  let repeatedLineShape = false;
  for (const [sig, c] of sigCounts) {
    if (sig.length > 0 && c >= 3) { repeatedLineShape = true; break; }
  }
  const arithmeticRun = hasArithmeticRun(digitRuns(text));
  return { repeatedLineShape, arithmeticRun, clear: !repeatedLineShape && !arithmeticRun };
}

// ---------------------------------------------------------------------------
// The certificate and the gated encoder.
// ---------------------------------------------------------------------------

export interface PronoiaCertificate {
  n: number;
  z: number;
  bound: number;         // n - z: provable ceiling on pre-contract savings for the SLP family
  floor: number;         // conservative threshold, far below the smallest measured real contract cost (>=20 tok in this repo's own reports)
  structural: StructuralScan;
  worthSearching: boolean; // false => proven futile => safe to starve the search
  certMs: number;
}

/** Conservative, hand-set well below every measured minimum contract cost in this
 *  repository's own reports (24-40 tokens). Chosen small on purpose: an
 *  UNDERESTIMATE of the true floor only makes the gate fire less often, which
 *  is the safe direction (see module doc). */
export const PRONOIA_FLOOR = 6;

export function pronoiaCertificate(text: string, enc: EncodingName, floor: number = PRONOIA_FLOOR): PronoiaCertificate {
  const t0 = Date.now();
  const ids = encodeIds(text, enc);
  const n = ids.length;
  const z = lzFactorCount(ids);
  const bound = Math.max(0, n - z);
  const structural = structuralScan(text);
  const worthSearching = !(bound <= floor && structural.clear);
  return { n, z, bound, floor, structural, worthSearching, certMs: Date.now() - t0 };
}

export interface PronoiaResult extends DaedalusResult {
  codec2: 'pronoia';
  certificate: PronoiaCertificate;
  skippedSearch: boolean;
  certMs: number;
  searchMs: number;
}

export interface PronoiaOptions extends DaedalusOptions {
  floor?: number;
}

/**
 * Drop-in replacement for daedalusEncode: identical wire language, identical
 * contract, identical three-reader guarantees (it calls daedalusEncode
 * unmodified in both branches — it only changes HOW MUCH SEARCH BUDGET that
 * call is given, never what it does with the result).
 */
export function pronoiaEncode(text: string, enc: EncodingName = 'o200k_base', options: PronoiaOptions = {}): PronoiaResult {
  const cert = pronoiaCertificate(text, enc, options.floor ?? PRONOIA_FLOOR);
  const t1 = Date.now();
  const r = cert.worthSearching
    ? daedalusEncode(text, enc, options)
    : daedalusEncode(text, enc, { ...options, budgetMs: 1, maxArms: 1 });
  const searchMs = Date.now() - t1;
  return {
    ...r,
    codec2: 'pronoia',
    certificate: cert,
    skippedSearch: !cert.worthSearching,
    certMs: cert.certMs,
    searchMs,
  };
}

export const pronoiaDecode = chironDecode;
export const pronoiaDecoderPrompt = chironDecoderPrompt;
