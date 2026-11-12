/**
 * ΣΥΜΜΕΤΡΟΝ (SYMMETRON) — "commensurate": a proxy that speaks the objective's units.
 * =============================================================================
 *
 * WHAT PROBLEM THIS ACTUALLY SOLVES
 * -----------------------------------------------------------------------------
 * ΧΕΙΡΩΝ's macro loop is a hill-climb over SLP rules, and at every epoch it has
 * to decide WHICH candidate phrases are worth pricing exactly.  Pricing is the
 * scarce resource: the whole variant sweep draws on ONE shared deterministic work
 * meter (CHIRON_MAX_TOTAL_WORK_UNITS), and X101 measured that meter 96 %/75 %/73 %
 * exhausted on exactly the lanes where more search would pay.  So the cheap
 * ranking that decides which candidates reach the exact pricer is not a detail —
 * under a starved meter it IS the search.
 *
 * The shipped ranking is denominated in CHARACTERS:
 *
 *      rough = c * (p.length - 1) - p.length - 1
 *
 * while the objective it proxies is denominated in TOKENS:
 *
 *      bound = c * (t - 1) - t - 1,   t = countTokens(p)
 *
 * A 2-token 40-character phrase and a 2-token 6-character phrase get very
 * different character ranks and identical token ranks.  The character proxy
 * therefore spends the meter on long phrases that may not pay and discards short
 * ones that do.
 *
 * `enumerateTokenSpans` already walks the token grid to build the candidate map,
 * and the span length `len` — the number of tokens the phrase occupies where it
 * currently sits — is a free by-product of that walk.  ΣΥΜΜΕΤΡΟΝ records it and
 * ranks by
 *
 *      rough = c * (len - 1) - len - 1
 *
 * which is the objective's own formula with `t` replaced by its free upper bound.
 * Zero extra meter cost, no new syntax, no new contract clause: the wire family,
 * the tape grammar and the decoder are ΧΕΙΡΩΝ's own, so the decode is ΧΕΙΡΩΝ's
 * own and exactness is inherited rather than re-argued.
 *
 * WHY IT IS A SWEEP DIMENSION AND NOT A DEFAULT
 * -----------------------------------------------------------------------------
 * Measured at the PRODUCTION work envelope (no workUnits override, so the full
 * 64M-unit meter, bench/x109/receipts/sym2.out), forcing the token proxy on every
 * lane gives ΣΔ -7 over 7 lanes: 5 win, 1 lose, 1 same.  The one loss is
 * `dpkg-l` at +5.  A mechanism that loses a lane cannot be a default under this
 * repository's Pareto rule, so ΣΥΜΜΕΤΡΟΝ is shipped the way ΤΥΠΟΣ's
 * `exactAcceptVariants` is: the base variants rank by tokens, and the opposite
 * proxy is admitted as extra variants ONLY when the shared meter still has
 * headroom (`workLeft > initialWorkBudget * EXACT_ADMIT`).  The sweep then keeps
 * whichever is cheaper, so no lane can be made worse by the dimension's presence.
 *
 *   bench/x109/receipts/sym3.out — the A/B that justifies the shipped form:
 *     char-proxy only  4314   vs   both proxies swept  4302   ΣΔ -12
 *     5 win / 0 lose / 2 same, exact 7/7, chironDecode-verified 7/7,
 *     and the admitted opposite-proxy variant WON on 1 of 7 lanes, which is the
 *     evidence that the headroom gate fires at all.
 *
 * THE MEASUREMENT TRAP THIS MODULE EXISTS TO DOCUMENT
 * -----------------------------------------------------------------------------
 * The same A/B run at a starved 8M-unit grant gives ΣΔ +8 and REVERSES THE SIGN on
 * two lanes (findmnt +2 → -3, npm-ls +6 → -3).  A starved grant is not a small
 * perturbation of the production regime: it changes which candidates the prefilter
 * keeps, so it changes the answer.  Any proxy or ordering claim in this repository
 * must be measured at the production envelope before it means anything.
 *
 * HONEST LIMIT
 * -----------------------------------------------------------------------------
 * The gain is small and general rather than large: -12 tokens over 7 ΧΕΙΡΩΝ-layer
 * lanes, i.e. about 0.3 %.  It is a search-efficiency improvement, not a new
 * information-theoretic idea, and it does not touch the 77.8 % of the wire that is
 * body.  It is reported as what it is.
 */
import { chironEncode, chironDecode, symmetronOn } from './chiron';
import { countTokens, type EncodingName } from './bpe';

export interface SymmetronResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  contractTokens: number;
  /** which proxy the winning variant ranked by, read out of ΧΕΙΡΩΝ's own notes */
  proxy: 'token' | 'character' | 'unknown';
  /** the winning ΧΕΙΡΩΝ variant tag, e.g. `full-charproxy/"\n"` */
  variant: string;
  notes: string;
}

/** Read the winning variant tag out of ΧΕΙΡΩΝ's notes string. */
function winningVariant(notes: string): string {
  const m = /variant=([^;]+)/.exec(notes ?? '');
  return m ? m[1]!.trim() : 'unknown';
}

/**
 * Encode with ΣΥΜΜΕΤΡΟΝ: ΧΕΙΡΩΝ's sweep with BOTH proxies available.  This is the
 * shipped form.  `force` pins a single proxy for the A/B that justifies it.
 */
export function symmetronEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: { force?: 'token' | 'character' } = {},
): SymmetronResult {
  const inTokens = countTokens(text, enc);
  const prev = process.env.OMEGA_NO_SYMMETRON;
  if (opts.force === 'token') delete process.env.OMEGA_NO_SYMMETRON;
  if (opts.force === 'character') process.env.OMEGA_NO_SYMMETRON = '1';
  let r;
  try {
    r = chironEncode(text, enc);
  } finally {
    if (prev === undefined) delete process.env.OMEGA_NO_SYMMETRON;
    else process.env.OMEGA_NO_SYMMETRON = prev;
  }
  const outTokens = countTokens(r.wire, enc);
  const messageTokens = countTokens(r.decoderPrompt ?? r.wire, enc);
  const variant = winningVariant(r.notes ?? '');
  const proxy: SymmetronResult['proxy'] =
    variant.startsWith('full-charproxy') ? 'character'
      : variant.startsWith('full-tokproxy') ? 'token'
        : symmetronOn() ? 'token' : 'character';
  return {
    wire: r.wire,
    decoded: r.decoded,
    exact: r.decoded === text,
    inTokens,
    outTokens,
    messageTokens,
    contractTokens: messageTokens - outTokens,
    proxy,
    variant,
    notes: `symmetron: macro candidates ranked by ${proxy} span length; variant=${variant}; ${r.notes ?? ''}`,
  };
}

/** The decode is ΧΕΙΡΩΝ's own; ΣΥΜΜΕΤΡΟΝ introduces no syntax. */
export function symmetronDecode(wire: string): string {
  return chironDecode(wire);
}
