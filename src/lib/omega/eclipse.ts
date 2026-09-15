/**
 * ECLIPSE-E1 — exact readable portfolio plus contract-cost refinement.
 *
 * ECLIPSE searches a small, explicitly semantics-preserving normal-form set for
 * the decoder contract of the best exact candidate among ZENITH, SPLICE, REPLAY,
 * RAPTOR, and the inline structured-token FOLD lane. The admitted contract transformations remove the non-operative
 * adjective "exact" and shorten "other text literal" to "else literal". A
 * candidate is accepted only after its full wire, decoder result, and delivered
 * tokenizer cost are measured.
 *
 * Consequently ECLIPSE is weakly Pareto-dominant over the supplied portfolio on
 * delivered tokens, and can strictly improve when tokenizer-aware references
 * such as REPLAY, RAPTOR, or FOLD fit the tokenizer better. This is intentionally
 * modest: identity/incompressibility prevents strict improvement on every
 * possible input, and natural-language contract equivalence is not claimed as a
 * theorem.
 */
import { countTokens, type EncodingName } from './bpe';
import { zenithEncode, type ZenithResult } from './zenith';
import { spliceEncode, type SpliceResult } from './splice';
import { replayEncode, type ReplayResult } from './replay';
import { raptorEncode, type RaptorResult } from './raptor';
import { foldEncode, type FoldResult } from './fold';

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

type Refinable = Pick<ZenithResult, 'wire' | 'decoded' | 'exact' | 'inTokens' | 'outTokens' | 'contractPrompt' | 'contractTokens' | 'deliveredTokens' | 'deliveredVsRaw' | 'savingsPct' | 'sourceMember' | 'encodeMs' | 'notes'>;

function eclipseFromBase(
  text: string,
  zenith: Refinable,
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

export function eclipseFromZenith(text: string, zenith: ZenithResult, enc: EncodingName = 'o200k_base'): EclipseResult {
  return eclipseFromBase(text, zenith, enc);
}

export function eclipseFromCandidates(
  text: string,
  zenith: ZenithResult,
  splice: SpliceResult,
  replay?: ReplayResult | null,
  raptor?: RaptorResult | null,
  enc: EncodingName = 'o200k_base',
  fold?: FoldResult | null,
): EclipseResult {
  const candidates: Refinable[] = [
    zenith,
    { ...splice, sourceMember: splice.source, encodeMs: splice.encodeMs },
  ];
  if (replay) candidates.push({ ...replay, sourceMember: replay.source, encodeMs: replay.encodeMs });
  if (raptor) candidates.push({ ...raptor, sourceMember: raptor.source, encodeMs: raptor.encodeMs });
  if (fold) candidates.push({ ...fold, sourceMember: fold.mode, encodeMs: fold.encodeMs });
  const best = candidates.reduce((winner, candidate) =>
    candidate.exact && candidate.deliveredTokens < winner.deliveredTokens ? candidate : winner,
  );
  return eclipseFromBase(text, best, enc);
}

export async function eclipseEncode(text: string, enc: EncodingName = 'o200k_base'): Promise<EclipseResult> {
  const [zenith, splice, replay, raptor, fold] = await Promise.all([
    zenithEncode(text, enc),
    Promise.resolve(spliceEncode(text, enc)),
    Promise.resolve(replayEncode(text, enc)),
    Promise.resolve(raptorEncode(text, enc)),
    Promise.resolve(foldEncode(text, enc)),
  ]);
  return eclipseFromCandidates(text, zenith, splice, replay, raptor, enc, fold);
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
