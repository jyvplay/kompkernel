/**
 * ORBIT-M2 — set-wise Pareto tournament over exact readable lanes.
 *
 * Proven scope: for a fixed input and tokenizer, ORBIT emits no more tokens
 * than any accepted exact candidate listed below, because it returns their
 * measured argmin unchanged. Not a claim of global codec optimality.
 */
import { countTokens, type EncodingName } from './bpe';
import { apexEncode, type ApexResult } from './apex';
import { anaphoraEncode, anaphoraDecoderPrompt } from './anaphora';
import { helixEncode, HELIX_SYSTEM_PROMPT } from './helix';
import { meridianEncode, MERIDIAN_SYSTEM_PROMPT } from './meridian';
import { quasarEncode, QUASAR_SYSTEM_PROMPT } from './quasar';
import { veritasEncode, VERITAS_SYSTEM_PROMPT } from './veritas';
import { plexusEncode, PLEXUS_SYSTEM_PROMPT } from './plexus';
import { pulseEncode, PULSE_SYSTEM_PROMPT } from './pulse';
import { axiomEncode, AXIOM_SYSTEM_PROMPT, type AxiomLedgerEntry } from './axiom';
import { tesseraEncode, TESSERA_SYSTEM_PROMPT } from './tessera';
import { strataEncode, STRATA_SYSTEM_PROMPT } from './strata';
import { signetEncode, SIGNET_SYSTEM_PROMPT } from './signet';
import { mosaicEncode, mosaicDecoderPrompt } from './mosaic';

export type OrbitLane =
  | 'identity'
  | 'apex'
  | 'meridian'
  | 'anaphora'
  | 'quasar'
  | 'plexus'
  | 'pulse'
  | 'helix'
  | 'veritas'
  | 'axiom'
  | 'tessera'
  | 'strata'
  | 'signet'
  | 'mosaic';

export interface OrbitResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  lane: OrbitLane;
  audit: Array<{ lane: OrbitLane; tokens: number; exact: boolean }>;
  notes: string;
}

export interface OrbitSuppliedMembers {
  meridian?: ReturnType<typeof meridianEncode>;
  anaphora?: ReturnType<typeof anaphoraEncode>;
  quasar?: ReturnType<typeof quasarEncode>;
  plexus?: ReturnType<typeof plexusEncode>;
  pulse?: ReturnType<typeof pulseEncode>;
  helix?: ReturnType<typeof helixEncode>;
  veritas?: ReturnType<typeof veritasEncode>;
  axiom?: ReturnType<typeof axiomEncode>;
  tessera?: ReturnType<typeof tesseraEncode>;
  strata?: ReturnType<typeof strataEncode>;
  signet?: ReturnType<typeof signetEncode>;
  mosaic?: ReturnType<typeof mosaicEncode>;
}

const orbitCache = new Map<string, OrbitResult>();
const ORBIT_CACHE_MAX = 8;
const ORBIT_CACHE_MAX_CHARS = 300_000;

export async function orbitEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  suppliedApex?: ApexResult | null,
  ledger: AxiomLedgerEntry[] = [],
  supplied: OrbitSuppliedMembers = {},
): Promise<OrbitResult> {
  const cacheKey = !suppliedApex && ledger.length === 0 && Object.keys(supplied).length === 0 && text.length <= ORBIT_CACHE_MAX_CHARS ? enc + '\u0000' + text : null;
  if (cacheKey) {
    const hit = orbitCache.get(cacheKey);
    if (hit) return hit;
  }
  const inTokens = countTokens(text, enc);
  const apex = suppliedApex ?? (await apexEncode(text, enc));
  const meridian = supplied.meridian ?? meridianEncode(text, enc);
  const anaphora = supplied.anaphora ?? anaphoraEncode(text, enc);
  const quasar = supplied.quasar ?? quasarEncode(text, enc);
  const plexus = supplied.plexus ?? plexusEncode(text, enc);
  const pulse = supplied.pulse ?? pulseEncode(text, enc);
  const helix = supplied.helix ?? helixEncode(text, enc);
  const veritas = supplied.veritas ?? veritasEncode(text, enc);
  const axiom = supplied.axiom ?? axiomEncode(text, enc, ledger);
  const tessera = supplied.tessera ?? tesseraEncode(text, enc);
  const strata = supplied.strata ?? strataEncode(text, enc);
  const signet = supplied.signet ?? signetEncode(text, enc);
  const mosaic = supplied.mosaic ?? mosaicEncode(text, enc);

  const candidates: Array<{ lane: OrbitLane; wire: string; decoded: string; exact: boolean }> = [
    { lane: 'identity', wire: text, decoded: text, exact: true },
    { lane: 'apex', wire: apex.wire, decoded: apex.decoded, exact: apex.exact },
    { lane: 'meridian', wire: meridian.wire, decoded: meridian.decoded, exact: meridian.exact },
    { lane: 'anaphora', wire: anaphora.wire, decoded: anaphora.decoded, exact: anaphora.exact },
    { lane: 'quasar', wire: quasar.wire, decoded: quasar.decoded, exact: quasar.exact },
    { lane: 'plexus', wire: plexus.wire, decoded: plexus.decoded, exact: plexus.exact },
    { lane: 'pulse', wire: pulse.wire, decoded: pulse.decoded, exact: pulse.exact },
    { lane: 'helix', wire: helix.wire, decoded: helix.decoded, exact: helix.exact },
    { lane: 'veritas', wire: veritas.wire, decoded: veritas.decoded, exact: veritas.exact },
    { lane: 'axiom', wire: axiom.wire, decoded: axiom.decoded, exact: axiom.exact },
    { lane: 'tessera', wire: tessera.wire, decoded: tessera.decoded, exact: tessera.exact },
    { lane: 'strata', wire: strata.wire, decoded: strata.decoded, exact: strata.exact },
    { lane: 'signet', wire: signet.wire, decoded: signet.decoded, exact: signet.exact },
    { lane: 'mosaic', wire: mosaic.wire, decoded: mosaic.decoded, exact: mosaic.exact },
  ];

  const audit = candidates.map((c) => ({
    lane: c.lane,
    tokens: countTokens(c.wire, enc),
    exact: c.exact && c.decoded === text,
  }));
  const accepted = candidates.filter((c) => c.exact && c.decoded === text);
  accepted.sort((a, b) => countTokens(a.wire, enc) - countTokens(b.wire, enc));
  const winner = accepted[0] ?? candidates[0];
  const outTokens = countTokens(winner.wire, enc);

  const result = {
    wire: winner.wire,
    decoded: text,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    lane: winner.lane,
    audit,
    notes: `ORBIT winner=${winner.lane}; exact argmin over ${accepted.length} verified lanes.`,
  };
  if (cacheKey) {
    if (orbitCache.size >= ORBIT_CACHE_MAX) orbitCache.clear();
    orbitCache.set(cacheKey, result);
  }
  return result;
}

export function orbitDecoderPrompt(result?: OrbitResult | null): string {
  const lane = result?.lane ?? 'unknown';
  const contract =
    lane === 'meridian'
      ? MERIDIAN_SYSTEM_PROMPT
      : lane === 'anaphora'
        ? anaphoraDecoderPrompt(null)
        : lane === 'quasar'
          ? QUASAR_SYSTEM_PROMPT
          : lane === 'plexus'
            ? PLEXUS_SYSTEM_PROMPT
            : lane === 'pulse'
              ? PULSE_SYSTEM_PROMPT
              : lane === 'helix'
                ? HELIX_SYSTEM_PROMPT
                : lane === 'veritas'
                  ? VERITAS_SYSTEM_PROMPT
                    : lane === 'mosaic'
                      ? mosaicDecoderPrompt(null)
                      : lane === 'signet'
                        ? SIGNET_SYSTEM_PROMPT
                      : lane === 'strata'
                        ? STRATA_SYSTEM_PROMPT
                      : lane === 'tessera'
                        ? TESSERA_SYSTEM_PROMPT
                      : lane === 'axiom'
                        ? AXIOM_SYSTEM_PROMPT
                    : lane === 'apex'
                      ? 'The wire is the exact APEX tournament winner; use its visible local contract and preserve all literal data.'
                      : '';
  return [`# ORBIT-M2 exact readable tournament; selected lane=${lane}`, contract, 'If the winner is identity, the text is literal.']
    .filter(Boolean)
    .join('\n');
}
