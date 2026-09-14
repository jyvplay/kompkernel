/**
 * ECLIPSE-E1 — contract-cost refinement over ZENITH.
 *
 * This codec does not invent a second wire grammar. It searches a small,
 * explicitly semantics-preserving normal-form set for the decoder contract of
 * ZENITH's already exact wire. The only transformations currently admitted are
 * removal of the non-operative adjective "exact" and the equivalent shorter
 * phrase "other text literal" → "else literal". The wire and decoder identity
 * are inherited unchanged; a candidate is accepted only when it is no longer
 * than ZENITH's contract.
 *
 * Consequently ECLIPSE is weakly Pareto-dominant over ZENITH on delivered
 * tokens, and can strictly improve only when the tokenizer charges the shorter
 * normal form less. This is intentionally modest: natural-language contract
 * equivalence is the remaining external interface and is not claimed as a
 * theorem.
 */
import { countTokens, type EncodingName } from './bpe';
import { zenithEncode, type ZenithResult } from './zenith';

export interface EclipseResult extends Omit<ZenithResult, 'renderer'> {
  renderer: 'eclipse-contract';
  contractVariantsTried: number;
}

function contractCandidates(contract: string): string[] {
  const candidates = [contract];
  if (contract.includes(' exact:')) candidates.push(contract.replace(' exact:', ':'));
  if (contract.includes('; other text literal.')) candidates.push(contract.replace('; other text literal.', '; else literal.'));
  if (contract.includes('; other text literal.') && contract.includes(' exact:')) {
    candidates.push(contract.replace(' exact:', ':').replace('; other text literal.', '; else literal.'));
  }
  return [...new Set(candidates)];
}

export function eclipseFromZenith(
  text: string,
  zenith: ZenithResult,
  enc: EncodingName = 'o200k_base',
): EclipseResult {
  const variants = contractCandidates(zenith.contractPrompt);
  let best = zenith.contractPrompt;
  let bestTokens = countTokens(best, enc);
  for (const candidate of variants) {
    const tokens = countTokens(candidate, enc);
    if (tokens < bestTokens) {
      best = candidate;
      bestTokens = tokens;
    }
  }
  const wireTokens = countTokens(zenith.wire, enc);
  const inTokens = countTokens(text, enc);
  const deliveredTokens = wireTokens + bestTokens;
  // The guard is deliberately non-strict: a normal-form contract cannot cause
  // a regression, and identity remains the inherited ZENITH fallback.
  if (!zenith.exact || deliveredTokens > zenith.deliveredTokens) {
    return { ...zenith, renderer: 'eclipse-contract', contractVariantsTried: variants.length };
  }
  return {
    ...zenith,
    inTokens,
    outTokens: wireTokens,
    contractPrompt: best,
    contractTokens: bestTokens,
    deliveredTokens,
    deliveredVsRaw: inTokens - deliveredTokens,
    savingsPct: inTokens ? ((inTokens - wireTokens) / inTokens) * 100 : 0,
    renderer: 'eclipse-contract',
    contractVariantsTried: variants.length,
    notes: `ECLIPSE contract normal-form search: ${variants.length} candidates; wire inherited from ZENITH/${zenith.sourceMember}; delivered ${deliveredTokens}`,
  };
}

export async function eclipseEncode(text: string, enc: EncodingName = 'o200k_base'): Promise<EclipseResult> {
  return eclipseFromZenith(text, await zenithEncode(text, enc), enc);
}

export interface EclipseSelfTest { name: string; pass: boolean; details: string }
export async function eclipseSelfTest(enc: EncodingName = 'o200k_base'): Promise<EclipseSelfTest[]> {
  const cases = [
    '',
    'A'.repeat(1200),
    Array.from({ length: 40 }, (_, i) => `{"id":${i},"ok":true,"svc":"gateway"}`).join('\n'),
    'header\n' + 'A'.repeat(500) + '\n' + '{"ok":true}',
  ];
  const out: EclipseSelfTest[] = [];
  for (const text of cases) {
    try {
      const r = await eclipseEncode(text, enc);
      out.push({ name: `${text.length} chars`, pass: r.exact && r.decoded === text && r.deliveredTokens <= r.inTokens, details: `${r.deliveredTokens}/${r.inTokens}; variants=${r.contractVariantsTried}` });
    } catch (e) {
      out.push({ name: `${text.length} chars`, pass: false, details: (e as Error).message });
    }
  }
  return out;
}
