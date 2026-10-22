/**
 * EUTELEIA (εὐτέλεια — "cheapness, low price, frugality").
 *
 * X37. Every codec in this stack injects symbols into the wire that carry no
 * information from the source: a framing bracket here, a marker there, a word
 * in the instruction clause. Each of them was chosen once, at authoring time,
 * by a COLLISION argument — pick something that cannot occur in real text so
 * the reader can never mistake it for payload — and each of them was then
 * priced as though choosing it were free.
 *
 * It is not free. The decoder tokenizer is byte-level BPE: a code point that
 * never occurred often enough in training to earn a merge falls back to its
 * raw UTF-8 bytes, and the number of tokens it costs is essentially the number
 * of bytes it occupies. Measured on o200k_base in this repository
 * (bench/x37/frame.ts, bench/x37/mk.ts):
 *
 *     ( N ~ X )     3.0 tokens of framing      ASCII, 1 byte each
 *     [ N ~ X ]     3.3
 *     « N ~ X »     3.5
 *     { N ~ X }     3.8
 *     ⌈ N ~ X ⌉     6.0
 *     ⟦ N ⇤ X ⟧     8.8      <- the X36 choice
 *
 * ANADIPLOSIS shipped with ⟦ ⟧ ⇤ because they are vanishingly rare and can
 * therefore never collide with a source document. That reasoning is sound and
 * the conclusion is expensive: the rarity that buys the collision guarantee is
 * exactly the property that makes the tokenizer charge for them. Three bytes
 * each, no merges, three tokens apiece. The X36 wire paid 8.8 tokens of
 * framing per span where 3.0 would do, on a document carrying 126 spans.
 *
 * So the priced quantity was never the thing being argued about. The argument
 * was "which symbols are SAFE"; the cost is "which symbols are CHEAP"; and the
 * two were never compared.
 *
 * WHAT THIS CODEC DOES
 * ---------------------------------------------------------------------------
 * EUTELEIA replaces convention with measurement, in two places, and always
 * against the exact objective.
 *
 *   1. A FRAMING AUCTION. ANADIPLOSIS takes the first collision-free framing
 *      from a statically ordered list. EUTELEIA tries every collision-free
 *      framing, tokenizes the wire each one actually produces, and keeps the
 *      cheapest. Safety is preserved exactly: a framing is a candidate only if
 *      none of its three characters occur in the source. What changes is that
 *      among the safe choices the cheap one wins, measured rather than assumed.
 *
 *   2. A CLAUSE AUCTION. The contract clause is spliced in front of a sentence
 *      that already exists, so its price is not the price of the clause in
 *      isolation — it is the price of the junction. Measured here, the X36
 *      clause is 10 tokens and "(N~X)=X*N." is 7, and both state the same
 *      fact to the reader. EUTELEIA scores every wording by measuring the
 *      exact contract string it produces and keeps the minimum.
 *
 * Both auctions are scored on real token counts and the whole transform is
 * gated on the measured full message, so EUTELEIA can never be worse than
 * ANADIPLOSIS. It is a strict superset: ANADIPLOSIS is EUTELEIA with the
 * auction disabled.
 *
 * WHAT WAS MEASURED AND REFUSED (the negative space)
 * ---------------------------------------------------------------------------
 * The obvious generalisation — reprice EVERY control symbol in the stack —
 * was run and is a null result, and it is recorded so nobody reruns it.
 * bench/x37/delim.ts substitutes cheaper candidates for the CHIRON tape
 * markers § (U+00A7) and ¶ (U+00B6) across ten lanes: gain 0 on eight of
 * them and 1 token on two. Those two characters ARE single tokens in
 * o200k_base; they were chosen well. bench/x37/situ.ts substitutes each tape
 * glyph for sixty unused pool glyphs and measures the whole wire: the token
 * count is invariant, so the CHIRON claim that every pool glyph costs one
 * token in situ holds and there is nothing to win by reassigning them. The
 * overcharge was real but it was local to genuinely rare multi-byte symbols,
 * and the only symbol in the shipped stack that was one is the ANADIPLOSIS
 * framing.
 *
 * Source article. The byte-fallback floor that makes a rare code point cost
 * roughly one token per byte is standard and documented — Hugging Face's
 * tokenizer summary, and arXiv 2610.01984 (Universal Byte-Level Encoding,
 * October 2026), which names it the "encoding floor" and measures that
 * underrepresented spans stay near it even at 64K vocabulary (three tokens per
 * character for Ol Chiki and Tifinagh). That is the mechanism. The
 * application — that a lossless encoder choosing its own control symbols must
 * auction them against that floor rather than against a collision argument —
 * and both auctions here are original to this repository.
 *
 * Greedy: no. Every framing is scored on the real wire it produces and every
 * clause on the real contract it produces; the transform is accepted only when
 * the measured full message is strictly smaller than the parent's.
 *
 * Bound: CPU-bound. The framing auction costs one extra pass of the span scan
 * plus one token count per candidate framing, and only the winning framing is
 * carried through the expensive dictionary search.
 *
 * Honest size: this is a small, universal, regression-free reduction on the
 * lanes where ANADIPLOSIS fires, and exactly zero everywhere else. It does not
 * move prose, and it does not claim to.
 */

import { countTokens, type EncodingName } from './bpe';
import {
  anadiplosisEncode, anadiplosisDecode, anadiplosisRoundTrip as anadiplosisRoundTripRef,
  anadiplosisPickFraming, anadiplosisPlan,
  anadiplosisClauseFor, ANADIPLOSIS_FRAMINGS,
  type AnadiplosisOptions, type AnadiplosisResult, type Framing,
} from './anadiplosis';
import { chironDecode } from './chiron';

/** Clause wordings. {O}/{C}/{M} are the framing characters. */
export const EUTELEIA_CLAUSE_TEMPLATES: string[] = [
  '{O}N{M}X{C} means X written N times.',
  '{O}N{M}X{C}=X*N.',
  '{O}N{M}X{C} means X repeated N times.',
  '{O}N{M}X{C}=N copies of X.',
  '{O}N{M}X{C}: X repeated N times.',
];

export function euteleiaClausesFor(framing: Framing): string[] {
  const [o, c, m] = framing;
  return EUTELEIA_CLAUSE_TEMPLATES.map((t) =>
    t.replace('{O}', o).replace('{C}', c).replace('{M}', m));
}

/** Framings that cannot occur in `text`. */
export function euteleiaFramings(text: string): Framing[] {
  return ANADIPLOSIS_FRAMINGS.filter(
    (f) => !text.includes(f[0]) && !text.includes(f[1]) && !text.includes(f[2]));
}

export interface EuteleiaResult extends AnadiplosisResult {
  euteleia: boolean;
  /** tokens the two auctions won against ANADIPLOSIS's first-fit choice */
  euteleiaGain: number;
  /** how many framings were safe to consider */
  euteleiaFramings: number;
}

/**
 * Encode. Runs the framing auction, then the clause auction, then gates on the
 * measured full message against ANADIPLOSIS.
 */
export function euteleiaEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: AnadiplosisOptions = {},
): EuteleiaResult {
  const parent = anadiplosisEncode(text, enc, opts);
  const plain: EuteleiaResult = {
    ...parent, euteleia: false, euteleiaGain: 0, euteleiaFramings: 0,
  };
  if (opts.anadiplosis === false) return plain;
  if (!text.length) return plain;

  const safe = euteleiaFramings(text);
  if (!safe.length) return { ...plain, euteleiaFramings: 0 };

  // --- 1. framing auction: score each safe framing on the wire it produces ---
  let best: Framing | null = null;
  let bestScore = Infinity;
  for (const f of safe) {
    let plan: ReturnType<typeof anadiplosisPlan>;
    try { plan = anadiplosisPlan(text, enc, { ...opts, framing: f }); } catch { continue; }
    if (!plan || plan.estimated <= 0) continue;
    const score = countTokens(plan.text, enc) + countTokens(' ' + anadiplosisClauseFor(f), enc);
    if (score < bestScore) { bestScore = score; best = f; }
  }
  if (!best) return { ...plain, euteleiaFramings: safe.length };

  // --- 2. carry the winner through the stack, with the clause ladder ---
  let r: AnadiplosisResult;
  try {
    r = anadiplosisEncode(text, enc, { ...opts, framing: best, clauseLadder: euteleiaClausesFor(best) });
  } catch { return { ...plain, euteleiaFramings: safe.length }; }

  // The auction can only be trusted if it is measured against the real parent.
  const first = anadiplosisPickFraming(text);
  const sameAsFirstFit = first !== null
    && first[0] === best[0] && first[1] === best[1] && first[2] === best[2];
  let chosen = r;
  let baseline = parent;
  if (!sameAsFirstFit) {
    // the auction picked a different framing: gate against ANADIPLOSIS directly
    if (parent.messageTokens < r.messageTokens || !r.anadiplosis) chosen = parent;
  }
  if (!chosen.anadiplosis) return { ...plain, euteleiaFramings: safe.length };
  if (chosen.messageTokens > baseline.messageTokens) {
    return { ...plain, euteleiaFramings: safe.length };
  }

  return {
    ...chosen,
    euteleia: true,
    euteleiaGain: baseline.messageTokens - chosen.messageTokens,
    euteleiaFramings: safe.length,
  };
}

/** Decode: identical to ANADIPLOSIS — the framing is carried on the result. */
export function euteleiaDecode(
  wire: string,
  cfg: { stats?: any; order?: 'in' | 'out'; undo: (w: string) => string },
  opts: { alphabet?: string; marker?: string; marker2?: string; group?: any; framing?: Framing } = {},
): string {
  return anadiplosisDecode(wire, cfg, opts);
}

/** Encode, decode, verify byte-exactness. */
export function euteleiaRoundTrip(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: AnadiplosisOptions = {},
): boolean {
  const r = euteleiaEncode(text, enc, opts);
  if (!r.anadiplosis) return anadiplosisRoundTripRef(text, enc, opts);
  const mid = anadiplosisDecode(r.wire, {
    stats: r.stats, order: r.order,
    undo: r.parent === 'identity' ? (w: string) => w : chironDecode,
  }, { alphabet: r.alphabet, marker: r.marker, marker2: r.marker2, group: r.syncopeGroup, framing: r.framing });
  return mid === text;
}
