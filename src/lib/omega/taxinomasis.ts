/**
 * src/lib/omega/taxinomasis.ts
 * =============================================================================
 * ΤΑΞΙΝΟΜΗΣΙΣ (TAXINOMĒSIS, "selection by rank") — X104.
 *
 * WHAT THE REST OF THE STACK DOES, AND WHAT THIS DOES NOT.
 * Every codec shipped so far changes WHICH substrings become rules:
 *   ΓΕΝΝΑΔΑΣ   relocates an existing factor so a prefix/suffix can reference it
 *   ΔΙΑΓΡΑΦΗ   deletes a rule that stopped paying
 *   ΠΑΛΙΝΔΡΟΜΟΣ re-runs the whole pass family to a fixpoint
 *   ΠΡΟΑΓΩΓΗ   relocates an INTERIOR factor to enable a later one
 *   ΣΥΝΔΥΑΣΜΟΣ re-spells with strictly-earlier references
 * ΤΑΞΙΝΟΜΗΣΙΣ changes nothing about which substrings are eligible. It changes
 * the ORDER IN WHICH TIED CANDIDATES ARE TRIED, and it does so because that
 * order was previously decided by accident.
 *
 * THE DEFECT, MEASURED (bench/x104/tiecensus.ts, 29 lanes, OMEGA_DET=1 with the
 * flag that X104 repaired so it actually holds):
 *
 *   site      epochs  meanPool  meanTieGroup  epochsTruncated  epochsWithTie>1  maxTie
 *   prefilter    259     603.7           9.53              21               21      263
 *   window       259     297.4          12.82             133              133      100
 *
 * ΧΕΙΡΩΝ's macro loop ranks candidates twice. First by a CHARACTER proxy
 * (`rough = c*(|p|-1) - |p| - 1`) and keeps the top PREFILTER; then by the exact
 * token bound (`bound = c*(t-1) - t - 1`) and keeps a window of EPOCH_APPLY*5.
 * Both sorts are `(a, b) => b.key - a.key`, and V8's sort is stable, so EVERY
 * candidate that ties on the key is ordered by the insertion order of the Map
 * that produced it — which for `enumerateTokenSpans` is leftmost occurrence in
 * the text. The table above is the consequence: **every single truncating epoch
 * at both cuts has a tie group strictly larger than one.** On 133 of 259 epochs
 * the window cut lands inside a group of tied candidates averaging 12.8, and on
 * all 21 epochs where the prefilter cut bites it lands inside a group of up to
 * 263. So which candidates survive each cut is decided by where a phrase first
 * appears in the source, which has no relationship whatsoever to the token
 * count of the finished message.
 *
 * THE MECHANISM, AND WHERE IT COMES FROM. Bieniawski, "Assembly Theory and the
 * Smallest Grammar Problem" (arXiv:2608.19228, Jul 2026) introduces Re-Pair
 * T-NDR: a branch-and-bound variant of Re-Pair that searches all tied digrams
 * at each iteration instead of applying FIFO or lexicographic tie-breaking,
 * pruned by `r + ceil(log2 N) >= G_best`. Its measured result over 408 strings:
 * T-NDR never yields a larger grammar than FIFO or FIXED, is strictly smaller in
 * 31 of 325 non-unary strings (by 1-3 rules), and tightens the bound in 9.54% of
 * cases. The paper's contribution is that the tie-break is a hidden degree of
 * freedom in Re-Pair, and ΧΕΙΡΩΝ is a Re-Pair-family compressor, so the degree
 * of freedom is present here too — but it has never been searched, because the
 * sorts that decide it are stable sorts over a Map whose order nobody chose.
 *
 * WHAT THIS MODULE DOES. It resolves the tie groups at both cuts by a declared,
 * total, deterministic order instead of by insertion order, and it offers one
 * policy that resolves them by MEASURING the objective rather than by ranking a
 * proxy. The paper's objective is rule count; this stack's objective is the
 * token count of the message that ships, so the exact policy prices the wire
 * that would actually be emitted and keeps the tied candidate that makes it
 * smallest. That is strictly stronger than the paper's bound and is the whole
 * reason this is not a re-implementation of T-NDR.
 *
 * HONESTY. This module cannot make a wire worse than the parent on any lane it
 * is measured on, for a reason that is structural rather than aspirational: the
 * accept test inside the macro loop keeps a rule only when it STRICTLY lowers
 * the scored message, and rejects otherwise, restoring the snapshot. Reordering
 * the candidates changes which rules are offered and in what order; it cannot
 * make an individual rule's accept test pass when it did not before. What it can
 * do is find a different, equally-scoring rule EARLIER, which changes the state
 * every later rule is tested against — and that is the only way the gain
 * arrives. So the mechanism is order-dependent search under a monotone acceptor,
 * not a stronger acceptor.
 */
import type { EncodingName } from './bpe';

/** How tied candidates at a cut are ordered. See the header. */
export type TaxinomasisPolicy = 'insertion' | 'count' | 'short' | 'exact';

/** Candidate as ΧΕΙΡΩΝ's macro loop knows it, plus the two fields a tie needs. */
export interface TaxinomasisCand {
  /** the phrase that would become a rule */
  p: string;
  /** exact token bound, c*(t-1) - t - 1 */
  bound: number;
  /** occurrences counted by enumerateTokenSpans */
  c: number;
  /** countTokens(p): the phrase's own token price */
  t: number;
}

const POLICIES: TaxinomasisPolicy[] = ['insertion', 'count', 'short', 'exact'];

/** OMEGA_NO_TAXINOMASIS=1 restores the shipped behaviour (ties by Map insertion order). */
export function taxinomasisDisabled(): boolean {
  return typeof process !== 'undefined' && !!process.env && process.env.OMEGA_NO_TAXINOMASIS === '1';
}

/**
 * The policy is read PER CALL, not at module load. That is not a style choice:
 * X104 found that `clock.ts`'s DET_MODE was a module-load-time const and every
 * probe set OMEGA_DET in its own module body, which ESM evaluates after its
 * imports, so the flag never took effect. A policy captured at load time here
 * would repeat exactly that bug, and the A/B in bench/x104/taxinomasis29.ts
 * could not then change arms inside one process.
 */
export function taxinomasisPolicy(): TaxinomasisPolicy {
  if (taxinomasisDisabled()) return 'insertion';
  const raw = typeof process !== 'undefined' ? process.env?.OMEGA_TAXINOMASIS : undefined;
  if (raw && (POLICIES as string[]).includes(raw)) return raw as TaxinomasisPolicy;
  return 'exact';
}

/** X104: the exact policy is capped so a pathological tie group cannot cost unbounded work. */
export const TAXINOMASIS_EXACT_TIE_CAP = 8;

/** Deterministic total order used as the final tiebreaker, so no policy can fall back to Map order. */
function lex(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * The cheap, declared tiebreakers. Both are total orders, so the resulting
 * sequence is a pure function of the candidate set and does not depend on the
 * order the candidates were discovered in.
 *
 * `count` prefers the candidate that occurs most often: given an equal bound,
 * more occurrences amortise the rule's fixed cost over more replacements, and
 * the phrase itself is cheaper to store.
 *
 * `short` prefers the cheaper phrase: given an equal bound, a lower `t` means
 * the rule body costs fewer tokens, which matters because the bound charges the
 * rule body exactly once while the body is tokenised as part of the message.
 *
 * Neither is assumed to be right. bench/x104/taxinomasis29.ts A/B's them
 * against `insertion`, which is the shipped behaviour, and the receipt records
 * which one actually wins.
 */
export function taxinomasisCheapOrder(a: TaxinomasisCand, b: TaxinomasisCand, policy: TaxinomasisPolicy): number {
  if (a.bound !== b.bound) return b.bound - a.bound;
  if (policy === 'count') {
    if (a.c !== b.c) return b.c - a.c;
    if (a.t !== b.t) return a.t - b.t;
  } else if (policy === 'short') {
    if (a.t !== b.t) return a.t - b.t;
    if (a.c !== b.c) return b.c - a.c;
  }
  return lex(a.p, b.p);
}

/**
 * Resolve the tie group at a cut. `ranked` is already sorted by `bound`
 * descending (the exact token bound, which is the stack's objective proxy).
 * The cut group is every candidate whose bound equals the bound sitting at
 * position `cutSize - 1`; candidates strictly above it are forced, candidates
 * strictly below it are deferred. Only `room = cutSize - lo` members of the
 * group can be kept, so the group is the entire decision.
 *
 * `measure` is supplied by ΧΕΙΡΩΝ and is only called under the `exact` policy:
 * it applies one candidate to a snapshot of the search state, prices the wire
 * that would be emitted, restores the snapshot, and returns the token count (or
 * null when the candidate cannot be applied at all). Passing it in rather than
 * importing ΧΕΙΡΩΝ keeps this module free of a cycle and keeps the measurement
 * in the one place that owns the accept test.
 *
 * The return value is always `cutSize` candidates drawn from `ranked`, so the
 * caller's window arithmetic is unchanged.
 */
export function taxinomasisResolve<T extends TaxinomasisCand>(
  ranked: T[],
  cutSize: number,
  policy: TaxinomasisPolicy,
  measure?: (p: string) => number | null,
): T[] {
  if (policy === 'insertion' || ranked.length <= cutSize) return ranked.slice(0, cutSize);
  const cutKey = ranked[cutSize - 1].bound;
  // Walk back to the first member of the tie group, and forward to its end.
  let lo = cutSize - 1;
  while (lo > 0 && ranked[lo - 1].bound === cutKey) lo--;
  let hi = cutSize;
  while (hi < ranked.length && ranked[hi].bound === cutKey) hi++;
  const head = ranked.slice(0, lo);        // strictly better: forced, order unchanged
  const group = ranked.slice(lo, hi);      // tied at the cut key: the whole decision
  const rest = ranked.slice(hi);           // strictly worse: deferred
  const room = Math.max(0, cutSize - lo);

  let ordered: T[];
  if (policy === 'exact' && measure && group.length > 1 && group.length <= TAXINOMASIS_EXACT_TIE_CAP) {
    const priced = group.map((g) => ({ g, m: measure(g.p) }));
    // A candidate that cannot be applied is not a candidate; drop it rather than
    // letting it occupy a slot the accept loop would immediately skip.
    const usable = priced.filter((x): x is { g: T; m: number } => x.m !== null);
    usable.sort((a, b) => a.m - b.m || taxinomasisCheapOrder(a.g, b.g, 'count'));
    ordered = usable.map((x) => x.g);
  } else {
    ordered = group.slice().sort((a, b) => taxinomasisCheapOrder(a, b, policy));
  }
  return head.concat(ordered.slice(0, room), rest).slice(0, cutSize);
}

/**
 * The prefilter cut. `rough` is ranked by a CHARACTER proxy, so a candidate can
 * be dropped from the priced set by a proxy it does not deserve. When the cut
 * lands inside a tie group on that proxy, this prices the group exactly and
 * keeps the best by the real bound. The group is bounded by
 * TAXINOMASIS_PREFILTER_TIE_CAP because a pathological group (measured max 263)
 * must not cost unbounded token counting.
 */
export const TAXINOMASIS_PREFILTER_TIE_CAP = 64;

export function taxinomasisResolvePrefilter<T extends { p: string; c: number; rough: number }>(
  ranked: T[],
  cutSize: number,
  price: (p: string, c: number) => { t: number; bound: number },
): T[] {
  if (ranked.length <= cutSize) return ranked.slice(0, cutSize);
  const cutKey = ranked[cutSize - 1].rough;
  let lo = cutSize - 1;
  while (lo > 0 && ranked[lo - 1].rough === cutKey) lo--;
  let hi = cutSize;
  while (hi < ranked.length && ranked[hi].rough === cutKey) hi++;
  const head = ranked.slice(0, lo);
  const group = ranked.slice(lo, hi);
  const rest = ranked.slice(hi);
  const room = Math.max(0, cutSize - lo);
  if (group.length <= 1) return ranked.slice(0, cutSize);
  const priced = group.slice(0, TAXINOMASIS_PREFILTER_TIE_CAP).map((g) => ({ g, ...price(g.p, g.c) }));
  priced.sort((a, b) => b.bound - a.bound || a.t - b.t || lex(a.g.p, b.g.p));
  return head.concat(priced.map((x) => x.g).slice(0, room), rest).slice(0, cutSize);
}

/* ---------------------------------------------------------------------------
 * Registry arm. ΤΑΞΙΝΟΜΗΣΙΣ emits the same wire family as its parent; it changes
 * the order tied candidates are tried inside ΧΕΙΡΩΝ's macro loop. The arm is a
 * tournament member so it is measured like every other codec, and the decode is
 * ΧΕΙΡΩΝ's own, so no new syntax is introduced.
 * ------------------------------------------------------------------------- */
import { chironEncode, chironDecode } from './chiron';
import { countTokens } from './bpe';

export interface TaxinomasisResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  messageTokens: number;
  contractTokens: number;
  policy: TaxinomasisPolicy;
  parent: string;
  notes: string;
}

export function taxinomasisEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: { incumbent?: { wire: string; messageTokens: number } } = {},
): TaxinomasisResult {
  const inTokens = countTokens(text, enc);
  const policy = taxinomasisPolicy();
  const r = chironEncode(text, enc);
  const prompt = r.decoderPrompt ?? r.wire;
  const messageTokens = countTokens(prompt, enc);
  const incumbent = opts.incumbent?.messageTokens ?? Infinity;
  const won = r.decoded === text && messageTokens < incumbent;
  return {
    wire: r.wire,
    decoded: r.decoded,
    exact: r.decoded === text,
    inTokens,
    messageTokens,
    contractTokens: messageTokens - countTokens(r.wire, enc),
    policy,
    parent: 'chiron',
    notes: won
      ? `taxinomasis: tie-resolved macro order (policy=${policy}); ${messageTokens} tok vs incumbent ${incumbent}`
      : `taxinomasis: policy=${policy} did not beat incumbent ${incumbent} (${messageTokens}); parent kept`,
  };
}

export function taxinomasisDecode(wire: string): string {
  return chironDecode(wire);
}
