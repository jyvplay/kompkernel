/**
 * src/lib/omega/registry.ts
 * =============================================================================
 * REAL-BPE AUDIT HARNESS FOR EVERY CODEC SHIPPED IN THIS REPOSITORY
 *
 * The application's own metrics module estimates tokens (estimateTokensBPE /
 * chars-per-4 style heuristics). Both are surfaced here beside the real 
 * tiktoken-equivalent count so the estimation error is visible and quantified.
 *
 * Every run is independently round-trip checked where a decoder exists.
 * Failures are reported, never hidden.
 * =============================================================================
 */

import { PRESETS, type NeuraleseOptions } from '@/lib/neuralese';
import { convertAdvanced, DEFAULT_ADVANCED } from '@/lib/neuralese-advanced';
import { encodeLosslessAscii } from '@/lib/neuralese-lossless';
import { cavemanCompress } from '@/lib/neuralese-caveman';
import { compressDragi } from '@/lib/neuralese-dragi';
import { compressWenyan } from '@/lib/neuralese-wenyan';
import { compressComposite, compressDragiAtScale } from '@/lib/neuralese-composite';
import { compileOrdosTriBand } from '@/lib/neuralese-ordos';
import { encodeAsg } from '@/lib/neuralese-asg';
import { compressAst } from '@/lib/neuralese-ast';
import { compileNoether } from '@/lib/neuralese-noether';
import { compressHolographic } from '@/lib/neuralese-holographic';
import { compressCaveHolo } from '@/lib/neuralese-caveholo';
import { compressIbCaveHolo } from '@/lib/neuralese-ib';

import { countTokens, encodeIds, type EncodingName } from './bpe';
import { omegaXiCompress, omegaXiDecode } from './atom-codec';
import { veritasEncode } from './veritas';
import { quasarEncode } from './quasar';
import { helixEncode } from './helix';
import { meridianEncode } from './meridian';
import { plexusEncode } from './plexus';
import { pulseEncode } from './pulse';
import { anaphoraEncode } from './anaphora';
import { axiomEncode } from './axiom';
import { tesseraEncode } from './tessera';
import { strataEncode } from './strata';
import { signetEncode } from './signet';
import { mosaicEncode } from './mosaic';
import { atlasEncodeCached as atlasEncode } from './atlas';
import { auroraEncodeCached as auroraEncode } from './aurora';
import { crownEncodeCached as crownEncode } from './crown';
import { irisEncode } from './iris';
import { kernelEncode } from './kernel';
import { zenithEncode } from './zenith';
import { eclipseEncode } from './eclipse';
import { rosettaEncode } from './rosetta';
import { harmoniaEncode } from './harmonia';
import { aetherEncode, aetherDecode, aetherDecoderPrompt, AETHER_SYSTEM_PROMPT } from './aether';
import { panaceaEncode, panaceaDecode, panaceaDecoderPrompt, PANACEA_SYSTEM_PROMPT } from './panacea';
import { synapseEncode, synapseDecode, synapseDecoderPrompt, SYNAPSE_SYSTEM_PROMPT } from './synapse';
import { noesisEncode, noesisDecode, noesisDecoderPrompt, NOESIS_SYSTEM_PROMPT } from './noesis';
import { apeironEncode, apeironDecode, apeironDecoderPrompt, APEIRON_SYSTEM_PROMPT } from './apeiron';
import { pantheonEncode, pantheonDecode, pantheonDecoderPrompt, PANTHEON_SYSTEM_PROMPT } from './pantheon';
import { telosEncode, telosDecode, telosDecoderPrompt, TELOS_SYSTEM_PROMPT } from './telos';
import { archeEncode, archeDecode, archeDecoderPrompt, ARCHE_SYSTEM_PROMPT } from './arche';
import { genesisEncode, genesisDecode, genesisDecoderPrompt, GENESIS_SYSTEM_PROMPT } from './genesis';
import { omniEncode, omniDecode, omniDecoderPrompt, OMNI_SYSTEM_PROMPT } from './omni';
import { khorosEncode, khorosDecode, khorosDecoderPrompt, KHOROS_SYSTEM_PROMPT } from './khoros';
import { kairosEncode, kairosDecode, kairosDecoderPrompt, KAIROS_SYSTEM_PROMPT } from './kairos';
import { anankeEncode, anankeDecode, anankeDecoderPrompt } from './ananke';
import { moiraEncode, moiraDecode, moiraDecoderPrompt } from './moira';
import { nemesisEncode, nemesisDecode, nemesisDecoderPrompt } from './nemesis';
import { themisEncode, themisDecode, themisDecoderPrompt } from './themis';
import { dikeEncode } from './dike';
import { eupraxiaEncode } from './eupraxia';
import { metisEncode } from './metis';
import { proteusEncode } from './proteus';
import { logosEncode } from './logos';
import { hermesEncode } from './hermes';
import { chironEncode, KAIROS_WORK_UNITS } from './chiron';
import { tachysEncode } from './tachys';
import { hydraEncode } from './hydra';
import { glossiaEncode } from './glossia';
import { eidosEncode } from './eidos';
import { aionEncode } from './aion';
import { mnemosyneEncode } from './mnemosyne';
import { nyxEncode } from './nyx';
import { echoEncode } from './echo';
import { letheEncode } from './lethe';
import { oracleEncode } from './oracle';
import { stichosEncode, stichosMetatronEncode } from './stichos';
import { periodosEncode } from './periodos';
import { anamnesisEncode } from './anamnesis';
import { ariadneEncode } from './ariadne';
import { sibylEncode } from './sibyl';
import { sequoyahEncode } from './sequoyah';
import { thothEncode } from './thoth';
import { palimpsestEncode } from './palimpsest';
import { daedalusEncode } from './daedalus';
import { grammaEncode } from './gramma';
import { kalligraphosEncode } from './kalligraphos';
import { crasisEncode } from './crasis';
import { anagnorisisEncode } from './anagnorisis';
import { enthymemeEncode } from './enthymeme';
import { daedalusDualEncode } from './daedalus-dual';
import { lakonikosEncode } from './lakonikos';
import { tabminEncode } from './tabmin';
import { uuidfoldEncode } from './uuidfold';
import { dirfoldEncode } from './dirfold';
import { dittoEncode } from './ditto';
import { phalanxEncode } from './phalanx';
import { phalanx2Encode } from './phalanx2';
import { phalanx3Encode } from './phalanx3';
import { phalanx4Encode } from './phalanx4';
import { phalanxA1Encode } from './phalanx-a1';
import { phalanxA2Encode } from './phalanx-a2';
import { phalanxA3Encode } from './phalanx-a3';
import { phalanxA4Encode } from './phalanx-a4';
import { phalanxA5Encode } from './phalanx-a5';
import { phalanxA6Encode } from './phalanx-a6';
import { phalanxA7Encode } from './phalanx-a7';
import { phalanxA8Encode } from './phalanx-a8';
import { phalanxA9Encode } from './phalanx-a9';
import { veritasNEncode } from './veritas-n';
import { veritasREncode } from './veritas-r';
import { veritasKEncode } from './veritas-k';
import { veritasMEncode } from './veritas-m';
import { veritasQEncode } from './veritas-q';
import { veritasPEncode } from './veritas-p';
import { phalanxA10Encode } from './phalanx-a10';
import { veritasCEncode } from './veritas-c';
import { veritasUEncode } from './veritas-u';
import { veritasEncodeMulti, withVxLegend, veritasDecodeL } from './veritas-w';
import { amphoraEncode } from './amphora';
import { kanonEncode } from './kanon';
import { icarusEncode } from './icarus';
import { orthosEncode } from './orthos';
import { stentorEncode } from './stentor';
import { abacusEncode } from './abacus';
import { procrustesEncode } from './procrustes';
import { circeEncode } from './circe';
import { chimeraEncode } from './chimera';
import { caesuraEncode } from './caesura';
import { syntagmaEncode } from './syntagma';
import { prosoponEncode } from './prosopon';
import { epistleEncode } from './epistle';
import { arithmosEncode } from './arithmos';
import { kallosEncode } from './kallos';
import { panoptesEncode } from './panoptes';
import { epistemeEncode } from './episteme';
import { metatronEncode } from './metatron';
import { synizesisEncode } from './synizesis';
import { syntomiaEncode } from './syntomia';
import { eustochiaEncode } from './eustochia';
import { akribeiaEncode } from './akribeia';
import { logistikeEncode } from './logistike';
import { polytroposEncode } from './polytropos';
import { kionesEncode } from './kiones';
import { plinthosEncode } from './plinthos';
import { anastropheEncode } from './anastrophe';
import { kappaEncode } from './kappa';
import { phraseEncode } from './phrase';
import { tauEncode } from './tau';
import { valenceEncode } from './valence';
import { astralEncode } from './astral';
import { aeonEncode } from './aeon';
import { phoenixEncode } from './phoenix';
import { valkyrieEncode } from './valkyrie';
import { solarisEncode } from './solaris';
import { hyperionEncode } from './hyperion';
import { polarisEncode } from './polaris';
import { astraeaEncode } from './astraea';
import { chronosEncode } from './chronos';
import { tensorEncode } from './tensor';
import { lumenEncode } from './lumen';
import { hypergraphEncode } from './hypergraph';
import { synergyEncode } from './synergy';
import { kineticEncode } from './kinetic';
import { quantumEncode } from './quantum';
import { nebulaEncode } from './nebula';
import { zeroEncode } from './zero';
import { orionEncode } from './orion';
import { exodusEncode } from './exodus';
import { cadmusEncode } from './cadmus';
export { evaluateAllCodecsDynamically, type SynthesisSummary, type CodecEvaluationRun } from './codec-synthesis';

export type Fidelity = 'exact' | 'lossy' | 'unverified';

export interface CodecRun {
  key: string;
  label: string;
  family: string;
  fidelity: Fidelity;
  output: string;
  outChars: number;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  heuristicSavingsPct: number;
  estimateErrorPts: number;
  exact: boolean | null;
  tokensPerChar: number;
  ms: number;
  error?: string;
  note?: string;
  /** One-chat message cost in o200k tokens (decoder contract + wire, counted once).
   * Codec-reported (r.oneChat); when the output is the input unchanged it is the raw input count;
   * null when the codec reports no message cost (wire-only, inadmissible for ranking). */
  oneChatTokens: number | null;
}

const heuristicTokens = (s: string): number => Math.max(1, Math.round(s.length / 4));

export function makeExactTokenCounter(tokenizer: { name: string; encode: (text: string) => number[] }) {
  return (text: string) => tokenizer.encode(text).length;
}

export function realTokenCounter(enc: EncodingName) {
  return makeExactTokenCounter({
    name: enc,
    encode: (text: string) => encodeIds(text, enc),
  });
}

interface Entry {
  key: string;
  label: string;
  family: string;
  fidelity: Fidelity;
  deep?: boolean;
  run: (text: string, enc: EncodingName) => Promise<{ output: string; decoded?: string | null; note?: string; oneChat?: number }>;
}

function presetEntries(): Entry[] {
  return (Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => ({
    key: `preset_${String(k)}`,
    label: `${PRESETS[k].label}`,
    family: 'neuralese',
    fidelity: 'lossy' as Fidelity,
    run: async (text: string) => {
      const r = convertAdvanced(text, PRESETS[k].options as NeuraleseOptions, DEFAULT_ADVANCED);
      return { output: r.output, decoded: r.roundTrip ?? null };
    },
  }));
}

export function codecEntries(): Entry[] {
  const base: Entry[] = [
    ...presetEntries(),
    {
      key: 'veritasVx',
      label: '⟁ VERITAS-VX',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = veritasEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'exodus',
      label: '🌌 EXODUS-E1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = exodusEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'tensor',
      label: '𔔁 TENSOR-T1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = tensorEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'lumen',
      label: '💡 LUMEN-L1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = lumenEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'chronos',
      label: '⏳ CHRONOS-Ω',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = chronosEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'astraea',
      label: '🌌 ASTRAEA-A2',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = astraeaEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'polaris',
      label: '🌌 POLARIS-P1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = polarisEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'valence',
      label: '⨂ VALENCE-V1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = valenceEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'astral',
      label: '🌌 ASTRAL-A1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = astralEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'aeon',
      label: '♾ AEON-A1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = aeonEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'phoenix',
      label: '𓅂 PHOENIX-P1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = phoenixEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'valkyrie',
      label: '🛡️ VALKYRIE-V1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = valkyrieEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'solaris',
      label: '☀ SOLARIS-S1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = solarisEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'orion',
      label: '🌌 ORION-O10',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = orionEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'zero',
      label: '⚡ ZERO-Z10',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = zeroEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'nebula',
      label: '🌌 NEBULA-N9',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = nebulaEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'quantum',
      label: '⚛️ QUANTUM-Q9',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = quantumEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'kinetic',
      label: '⚡ KINETIC-K8',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = kineticEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'synergy',
      label: '🌀 SYNERGY-S2',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = synergyEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'hypergraph',
      label: '🕸️ HYPERGRAPH-H2',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = hypergraphEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'hyperion',
      label: '☀ HYPERION-H1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = hyperionEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'quasar',
      label: '✦ QUASAR',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = quasarEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'helixAp',
      label: '⟐ HELIX-AP',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = helixEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'meridian',
      label: '☉ MERIDIAN',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = meridianEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'plexus',
      label: '✺ PLEXUS-PX',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = plexusEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'mosaic',
      label: '▦ MOSAIC-M1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = mosaicEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'atlas',
      label: '✧ ATLAS-A1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = atlasEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'aurora',
      label: '◇ AURORA-A1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = auroraEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'kernel',
      label: '⊙ KERNEL-K1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await kernelEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'zenith',
      label: '☀ ZENITH-Z1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await zenithEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'eclipse',
      label: '◐ ECLIPSE-E1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await eclipseEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'iris',
      label: '◇ IRIS-I1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await irisEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'crown',
      label: '♛ CROWN-C1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await crownEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'signet',
      label: '⌗ SIGNET-G1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = signetEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'strata',
      label: '⨂ STRATA-S1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = strataEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'tessera',
      label: '⧉ TESSERA-T1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = tesseraEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'axiom',
      label: '⟦ AXIOM-A1 ⟧',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = axiomEncode(t, enc, []);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'anaphora',
      label: '⟐ Ω-ANAPHORA',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = anaphoraEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'pulse',
      label: '⟡ PULSE-R1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = pulseEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'kappa',
      label: 'κ KAPPA-κ1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = kappaEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'phrase',
      label: 'φ PHRASEBOOK-φ1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = phraseEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'tau',
      label: 'τ TAU-τ1',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = tauEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'cadmus', label: '⚔ CADMUS-Ω (Audited Portfolio)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await cadmusEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'proteus', label: '⬥ PROTEUS-Ω (Adaptive Grammar Frontier)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await proteusEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'logos', label: 'Ω LOGOS-Ω (Self-Referential Lexicon Frontier)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await logosEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'hermes', label: '信 HERMES-Ω (Self-Carried Single-Message Codec)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await hermesEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'icarus', label: '翼 ICARUS (Deterministic Latency Lane)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = icarusEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'daedalus', label: '⧗ DAEDALUS (Predicted-Arm Portfolio)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = daedalusEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'gramma', label: '⟐ GRAMMA-Ω (Notation-Dialect Menu: the layout is not shipped, it is regenerated from the reader\'s own formatting priors — JSON.stringify(v,null,N) re-print or bracket-depth re-indent; every dialect gated byte-exact on the text AND through the library CHIRON reader; plain DAEDALUS is a candidate, so it cannot lose on M)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = grammaEncode(t, enc); return { output: r.decoderPrompt, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; exact=${r.exact}; in=${r.inTokens}` }; },
    },
    {
      key: 'daedalus-dual', label: '⧗ DAEDALUS-D (DAEDALUS wire with a dual-tokenizer glyph pool: every glyph is one token under o200k_base AND cl100k_base; same decoder; decode-gated, identity fallback)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = daedalusDualEncode(t, enc); return { output: r.wire, decoded: r.exact ? t : r.wire, oneChat: r.messageTokens[enc === 'cl100k_base' ? 'cl100k_base' : 'o200k_base'], note: `mode=${r.mode}; arm=${r.winningArm}; o200k=${r.messageTokens.o200k_base}; cl100k=${r.messageTokens.cl100k_base} (raw o200k=${r.inTokens.o200k_base}, cl100k=${r.inTokens.cl100k_base})` }; },
    },
    {
      key: 'lakonikos', label: '⟡ LAKONIKOS (DAEDALUS wire, terse decoder contract: same wire and decoder, fewer contract tokens)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = lakonikosEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok (DAEDALUS ${r.messageTokensOld}) vs identity ${r.inTokens}` }; },
    },
    {
      key: 'kalligraphos', label: '✅ KALLIGRAPHOS (Unicode mathematical-alphabet restoration: styled decorative prose -> ASCII + style opcode; otherwise DAEDALUS unchanged; exact)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = kalligraphosEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `applied=${r.kalligraphosApplied}; spans=${r.kalligraphosSpans}; one-chat=${r.messageTokens} tok (contract counted)` }; },
    },
    {
      key: 'crasis', label: 'κ CRASIS (Punctuation-boundary fusion pre-pass: the single space after . ! ? , and before ( " is removed where the live tokenizer shows a compound token, then DAEDALUS; one-line context contract; per-message gated, identity-guarded; exact)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = crasisEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `applied=${r.crasisApplied}; rules=${r.crasisRules.join('') || '-'}${r.crasisFenced ? '/fenced' : ''}; fusion=${r.crasisGain}; plainM=${r.plainMessageTokens}; one-chat=${r.messageTokens} tok (contract counted)` }; },
    },
    {
      key: 'anagnorisis', label: 'ἀ ANAGNORISIS (Public-canon recognition pre-pass: standard open-source license texts and per-file notices (GitHub/choosealicense templates, versioned catalogue) are recognised byte-exactly — any per-line comment prefix, re-wrap width, url scheme, indentation — and replaced by 【SPDX-ID; layout…: blanks】 references the reader already knows; then DAEDALUS; one-line contract compiled from the features used; exact, identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = anagnorisisEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `applied=${r.canonApplied}; refs=${r.canonRefs.map(x => x.replace(/\n/g, '⏎')).join(' ') || '-'}; tiers=${r.canonTiers.join(',') || '-'}; regions=${r.canonRegionTokens}->${r.canonRefTokens} tok; plainM=${r.plainMessageTokens}; one-chat=${r.messageTokens} tok (contract counted)` }; },
    },
    {
      key: 'enthymeme', label: '∴ ENTHYMEME (Entailment elision: fields fixed by a public convention given their neighbours — the source file of a JVM stack frame, the GitHub slug of a Markdown heading link — are removed and restored by the reader from a one-sentence rule; then DAEDALUS; exact, identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = enthymemeEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `applied=${r.applied}; rules=${r.rules.join('+') || '-'}; elided=${r.elided} fields (${r.elidedTokens} raw tok); rule=${r.clauseTokens} tok; plainM=${r.plainMessageTokens}; one-chat=${r.messageTokens} tok (contract counted)` }; },
    },
    {
      key: 'anamnesis', label: 'ἀ ANAMNESIS (deterministic maximal-repeat core: no wall clock, work-bounded, CHIRON wire; single message, contract in band)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = anamnesisEncode(t, enc, { gate: false }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'anamnesis-gated', label: 'ἀ ANAMNESIS-G (same core, plus a one-call gate against the shipped frontier encoder so it cannot lose on token count)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = anamnesisEncode(t, enc, { gate: true }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.delegated ? 'frontier arm kept' : 'core kept'}; ${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'dirfold', label: '▤ DIRFOLD (same-directory path folding: ↑ = the directory of the line above; one-line rule; identity unless it pays)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = dirfoldEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `${r.mode}; folded=${r.folded} lines; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx', label: '▥ PHALANX (ASCII-only fixed pipeline: UUIDFOLD -> DIRFOLD-A -> DITTO -> VERITAS-VX; each stage gated; identity unless exact and cheaper)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `${r.mode}; stages=${r.stageTokens.join('/')}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx2', label: '▥ PHALANX-P2 (ASCII-only fixed pipeline: UUIDFOLD -> DIRFOLD-A -> DITTO -> KOINE-K1 (gated on the VERITAS output) -> VERITAS-VX; identity unless exact and cheaper)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanx2Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `${r.mode}; koine=${r.koineKept ? 'kept' : 'off'}; stages=${r.stageTokens.join('/')}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx3', label: '▥ PHALANX-P3 (ASCII-only fixed pipeline: UUIDFOLD -> DIRFOLD-A -> DITTO -> KOINE-K1 -> RECALL-R1 (both gated on VERITAS) -> VERITAS-VX; identity unless exact and cheaper)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanx3Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `${r.mode}; koine=${r.koineKept ? 'kept' : 'off'}; recall=${r.recallKept ? 'kept' : 'off'}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx4', label: '▦ PHALANX-P4 (KOINE and RECALL headers folded into one legend line; DITTO, DIRFOLD-A, UUIDFOLD inline; identity unless exact and cheaper)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanx4Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `${r.mode}; stages=[${r.applied.join(',')}]; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx-a1', label: '▣ PHALANX-A1 (PHALANX-P4 with VERITAS-A: one-token alias characters for VX references; all stages named in the in-message legend; identity unless exact and cheaper)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxA1Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `${r.mode}; vx=${r.vxKept}; stages=[${r.applied.join(',')}]; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx-a2', label: '▣ PHALANX-A2 (PHALANX-A1 with a shorter VXA legend and the per-file minimum over VX window W in {3,2,4}; decoder unchanged; identity unless exact and cheaper)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxA2Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `${r.mode}; vx=${r.vxKept}; stages=[${r.applied.join(',')}]; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx-a3', label: '▣ PHALANX-A3 (PHALANX-A2 plus a canonical-JSON layer: a document that is exactly JSON.stringify(v, null, N) is carried minified and re-indented by the decoder; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxA3Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `layer=${r.layer}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx-a4', label: '▣ PHALANX-A4 (PHALANX-A3 plus a gated log-template stage: tabular text with repeated line shapes is carried as templates plus variables; identity-guarded against A3)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxA4Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `layer=${r.layer}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx-a5', label: '▣ PHALANX-A5 (PHALANX-A4 plus a gated lossless hard-wrap layer: paragraphs that are exactly greedy-wrapped prose are carried unwrapped and re-wrapped by the decoder; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxA5Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `layer=${r.layer} width=${r.width}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx-a6', label: '▣ PHALANX-A6 (PHALANX-A5 plus a gated lossless table layer: column-aligned ops tables (ps, ls -l, df) are carried space-separated and re-padded by the decoder; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxA6Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `layer=${r.layer}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx-a7', label: '▣ PHALANX-A7 (PHALANX-A5 plus a gated lossless column layer: PADTAB2 fixed-cell rows with a verbatim free tail, so ls -l rows with symlink targets stay in one block; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxA7Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `layer=${r.layer}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'veritas-u', label: '⟁ VERITAS-U single-pass union dictionary (VXA wire and decoder; candidates of windows 2,3,4 in one greedy pass, no window tournament; exact whole-wire gate; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = veritasUEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `mode=${r.mode}; entries=${r.entries.length}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx-a10', label: '▣ PHALANX-A10 (PHALANX-A7 with VERITAS-C: token-window and character-substring dictionary, nested equals-free header, one greedy pass; same A7 layers; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxA10Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `layer=${r.layer}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'veritas-c', label: '⟁ VERITAS-C dictionary (token-window and character-substring candidates; nested equals-free header; VXC wire; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = veritasCEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `mode=${r.mode}; entries=${r.entries.length}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx-a9', label: '▣ PHALANX-A9 (PHALANX-A7 with VERITAS-N: the VERITAS-U dictionary whose header phrases may use shorter entries\' aliases; same A7 layers; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxA9Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `layer=${r.layer}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'veritas-n', label: '⟁ VERITAS-N nested-header dictionary (VERITAS-U selection; header phrases may refer to shorter entries; VXN wire; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = veritasNEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `mode=${r.mode}; entries=${r.entries.length}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'veritas-r', label: '⟁ VERITAS-R (VXR: greedy phrase dictionary with exact-count key reassignment and pruning; standard search budget; VXR wire; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = veritasREncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `entries=${r.entries}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'veritas-k', label: '⟁ VERITAS-K (VERITAS-R with wide greedy search for inputs up to 16000 chars; same VXR wire and decoder; standard budget above 16000 chars; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = veritasKEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `mode=${r.mode}; entries=${r.entries}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'veritas-m', label: '⟁ VERITAS-M (VERITAS-R with look-past, Cyrillic key pool and decode-gated key-swap hill-climb; full search up to 10000 chars; same VXR wire and decoder; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = veritasMEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `mode=${r.mode}; entries=${r.entries}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'phalanx-a8', label: '▣ PHALANX-A8 (PHALANX-A7 with the VERITAS-U single-pass union dictionary as its VX stage; same wire and decoder as A7; identity-guarded)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = phalanxA8Encode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `layer=${r.layer}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'veritas-q', label: '⟁ VERITAS-Q (VERITAS-M search; legend carries the decode instruction: minimal legend without escapes, escape legend with them; decoder unchanged; identity-guarded; NOT Pareto-superior on the 151-file corpus)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = veritasQEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `legend=${r.legend}; entries=${r.entries}; one-chat=${r.outTokens} tok (instruction counted) vs identity ${r.inTokens}` }; },
    },
    {
      key: 'veritas-p', label: '⟁ VERITAS-P (VERITAS-R wire with the VERITAS-Q legend; line-level exact-delta search with look-past, exact whole-wire acceptance in refinement; decode-gated; identity-guarded; NOT Pareto-superior on the 151-file corpus: +8.6% vs DAEDALUS/A10 frontier, -0.4% vs VERITAS-Q)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = veritasPEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `legend=${r.legend}; entries=${r.entries}; trials=${r.trials}; one-chat=${r.outTokens} tok (instruction counted) vs identity ${r.inTokens}` }; },
    },
    {
      key: 'veritas-vx-multi', label: '⟁ VERITAS-VX multi-window (trigram+bigram candidates, real-token gate; same VX1 wire and decoder)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = veritasEncodeMulti(t, enc); const w = withVxLegend(r.wire); return { output: w, decoded: veritasDecodeL(w), oneChat: countTokens(w, enc), note: `${r.mode}; ${r.entries.length} entries; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'ditto', label: '⋮ DITTO (per-field same-as-above marks ^, ASCII-only wire; one-line rule; identity unless it pays)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = dittoEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `${r.mode}; marked=${r.marked} fields; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'uuidfold', label: '▦ UUIDFOLD (canonical lowercase UUIDs as 32 uppercase digits, one-line restore rule; identity unless it pays)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = uuidfoldEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.outTokens, note: `${r.mode}; uuids=${r.uuids}; one-chat=${r.outTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'tabmin', label: '▦ TABMIN (rectangular tables: row arm or column-major arm, whichever is cheaper; column arm carries a one-line reader note)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = tabminEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.arm} arm; ${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'amphora', label: '⚱ AMPHORA (DAEDALUS ∥ CHIRON exact-gated minimum: adds the full-span CHIRON arm where DAEDALUS falls back to identity on long prose; two-arm tournament)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = amphoraEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'kanon', label: '⚖ KANON (HYLE table-fold gate → DAEDALUS on the folded body; AMPHORA otherwise: generated-column + aligned-table folds, no indentation folds, fixed arm)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = kanonEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}; gate=${r.gate}` }; },
    },
    {
      key: 'orthos', label: '♦ ORTHOS (Typographic Canonicalization Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = orthosEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'stentor', label: '《 STENTOR (Case-Canonicalization Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = stentorEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'abacus', label: '〒 ABACUS (Numeric/Unicode-Form Canonicalization Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = abacusEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'procrustes', label: '★ PROCRUSTES (Kerning/Fullwidth Canonicalization Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = procrustesEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'circe', label: '▶ CIRCE (Encoded/Injected-Artifact Restoration Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = circeEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'chimera', label: '▪ CHIMERA (Composed-Canonicalization Portfolio)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = chimeraEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'caesura', label: '═ CAESURA (Whitespace-Convention Canonicalization Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = caesuraEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'syntagma', label: '➡ SYNTAGMA (Hangul Canonical-Decomposition Restoration Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = syntagmaEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'prosopon', label: '₪ PROSOPON (Mojibake Wrong-Codepage Restoration Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = prosoponEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'epistle', label: '℃ EPISTLE (Quoted-Printable MIME Restoration Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = epistleEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'arithmos', label: '∞ ARITHMOS (Native-Script Numeral Restoration Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = arithmosEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'kallos', label: '✔ KALLOS (Styled Typography & Math Font Restoration Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = kallosEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'panoptes', label: '▬ PANOPTES (Universal Composed-Canonicalization Meta-Pre-Pass)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = panoptesEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'episteme', label: '◈ EPISTEME (Universal Morphological Transduction & Dual-Lattice Lossless Codec)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = epistemeEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'anastrophe', label: '↻ ANASTROPHE (Gated Permutation Family + Closure Result)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = anastropheEncode(t, enc, { maxConfigs: 3, configBudgetMs: 55, armBudgetMs: 3000 }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'plinthos', label: '▥ PLINTHOS (Multi-Block Column-Major Transpose)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = plinthosEncode(t, enc, { maxConfigs: 3, configBudgetMs: 55 }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'kiones', label: '▦ KIONES (Column-Major Block Transpose + Stack)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = kionesEncode(t, enc, { maxConfigs: 4, configBudgetMs: 60 }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'polytropos', label: '⟡ POLYTROPOS (Exact-Priced Engine Configuration Space)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = polytroposEncode(t, enc, { maxConfigs: 5, configBudgetMs: 70 }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'logistike', label: '⊿ LOGISTIKE (Exact Chunk-Additive Cost Algebra + Wide Portfolio)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = logistikeEncode(t, enc, { maxArms: 4, armBudgetMs: 80 }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'akribeia', label: '∴ AKRIBEIA (Exact-Measurement Portfolio + Drop-Polish)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = akribeiaEncode(t, enc, { maxArms: 3, armBudgetMs: 80 }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'eustochia', label: '◎ EUSTOCHIA (Aimed Arm Portfolio + Minimal Contract)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = eustochiaEncode(t, enc, { maxArms: 2, armBudgetMs: 80 }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'syntomia', label: '⌁ SYNTOMIA (Minimal-Sufficient Decode Contract + Gate Re-Run)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = syntomiaEncode(t, enc, { budgetMs: 1500 }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'synizesis', label: '⇒ SYNIZESIS (Pre-Tokenizer Boundary Collapse by Shape-Template Factoring)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = synizesisEncode(t, enc, { budgetMs: 1500 }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'metatron', label: '⟁ METATRON (Sovereign Morphological, Structural & Dual-Lattice Lossless Codec)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = metatronEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'palimpsest', label: '⎈ PALIMPSEST (Configuration Portfolio)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = palimpsestEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'thoth', label: '𓅜 THOTH (Suffix-Automaton Mining, Clock-Free)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = thothEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'sequoyah', label: '𐌔 SEQUOYAH (Clock-Free Deterministic Assignment)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = sequoyahEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'sibyl', label: '☘ SIBYL (Single-Token Rules + Pooled Alphabet)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = sibylEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'ariadne', label: '⟁ ARIADNE (Symbol-Space Optimal Parse + Glyph Assignment)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = ariadneEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'kairos', label: '⟐ KAIROS (CHIRON search, deterministic work-unit budget: same wire and decoder, reproducible output)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = chironEncode(t, enc, { workUnits: KAIROS_WORK_UNITS }); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok (contract ${r.contractTokens} + wire ${r.outTokens}) vs identity ${r.inTokens}` }; },
    },
    {
      key: 'chiron', label: '⟐ CHIRON (Two-Part-MDL Text Program)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = chironEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok (contract ${r.contractTokens} + wire ${r.outTokens}) vs identity ${r.inTokens}` }; },
    },
    {
      key: 'tachys', label: '⚡ TACHYS (Incompressibility-Certified Latency Lane)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = tachysEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'hydra', label: '🐉 HYDRA (Portfolio-Frontier Closure: TACHYS × KIONES)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = hydraEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'glossia', label: '👅 GLOSSIA (Grammar-Aware Fold: HYDRA × MOSAIC)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = glossiaEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'eidos', label: '⬣ EIDOS (Temporal-Delta Fold: GLOSSIA × Δ)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = eidosEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'aion', label: '♾ AION (Invariant-Delta Fold: EIDOS × Constant-Date)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = aionEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'mnemosyne', label: '🧠 MNEMOSYNE (Abstraction-Drain Fold: EIDOS × Template-*)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = mnemosyneEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'nyx', label: '🌑 NYX (Terminal-Program Fold: AION×MNEMOSYNE×OPT-BPE)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = nyxEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'echo', label: '🔊 ECHO (Causal-Thread Fold: quote-recursive ∇ + CHIRON)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = echoEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'lethe', label: '🌊 LETHE (Forgetfulness Fold: ECHO ∪ punct-stego ∇ + accents)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = letheEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'oracle', label: '🔮 ORACLE (Knowledge Fold: firstAuthorYear → parametric memory ∇ pages)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = oracleEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'stichos', label: '📜 STICHOS (Verse-Line Fold: greedy-refill layout ∇ + CHIRON stack)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = stichosEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'periodos', label: '¶ PERIODOS (per-paragraph measure: greedy-refill layout ∇ + CHIRON stack; reader must count columns — LLM decode unverified)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = periodosEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'stichos-metatron', label: '📜⟁ STICHOS∘METATRON (verse-line layout under METATRON)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = stichosMetatronEncode(t, enc); return { output: r.wire, decoded: r.decoded, oneChat: r.messageTokens, note: `${r.notes}; one-chat=${r.messageTokens} tok vs identity ${r.inTokens}` }; },
    },
    {
      key: 'metis', label: '⬤ METIS-Ω (Polymorphic Grammar Frontier)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await metisEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'eupraxia', label: '⬣ EUPRAXIA-Ω (Boundary-Superoptimized Frontier)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await eupraxiaEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'dike', label: '⬢ DIKE-Ω (Escape-Free Frontier)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await dikeEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'themis', label: '⬡ THEMIS-Ω (Succinct SLP Frontier)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await themisEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'nemesis', label: '◆ NEMESIS-Ω (Grammar-of-Grammar Frontier)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await nemesisEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'moira', label: '◇ MOIRA-Ω (Constituent Lattice Frontier)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await moiraEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'ananke', label: '◊ ANANKE-Ω (Residual Grammar Frontier)', family: 'exact', fidelity: 'exact',
      run: async (t, enc) => { const r = await anankeEncode(t, enc); return { output: r.wire, decoded: r.decoded, note: r.notes }; },
    },
    {
      key: 'khoros',
      label: '⟁ KHOROS-Ω (Terminal Sovereign Leader)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await khorosEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'omni',
      label: '⟁ OMNI-Ω (Terminal Sovereign)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await omniEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'genesis',
      label: '⟁ GENESIS-Ω (Terminal Sovereign)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await genesisEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'arche',
      label: '⟁ ARCHE-Ω (Terminal Sovereign)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await archeEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'telos',
      label: '⟁ TELOS-Ω (Terminal Sovereign)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await telosEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'pantheon',
      label: '⟁ PANTHEON-Ω (Terminal Sovereign Non-Rosetta Leader)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await pantheonEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'apeiron',
      label: '⟁ APEIRON-Ω (Terminal Boundless Non-Rosetta Leader)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await apeironEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'noesis',
      label: '⟁ NOESIS-Ω (Terminal Non-Rosetta Absolute Leader)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await noesisEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'synapse',
      label: '⟁ SYNAPSE-Ω (Terminal Non-Rosetta Leader)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await synapseEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'panacea',
      label: '⟁ PANACEA-Ω (Terminal Codec)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await panaceaEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'aether',
      label: '⟁ AETHER-A1 (General Prose Leader)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await aetherEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'harmonia',
      label: '⧢ HARMONIA-H1 (Pareto Leader)',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await harmoniaEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'rosetta',
      label: '𓋹 ROSETTA-R5.6',
      family: 'exact',
      fidelity: 'exact',
      run: async (t, enc) => {
        const r = await rosettaEncode(t, enc);
        return { output: r.wire, decoded: r.decoded, note: r.notes };
      },
    },
    {
      key: 'losslessAscii',
      label: 'Lossless ASCII',
      family: 'exact',
      fidelity: 'exact',
      run: async (t) => {
        const r = encodeLosslessAscii(t);
        return { output: r.output, decoded: r.decoded };
      },
    },
    { key: 'holographic', label: '🌀 Holographic', family: 'exact', fidelity: 'exact', run: async (t) => { const r = compressHolographic(t); return { output: r.output, decoded: r.decoded }; } },
    { key: 'asgJson', label: 'ASG JSON Rows', family: 'exact', fidelity: 'exact', run: async (t) => { const r = encodeAsg(t); return { output: r.output, decoded: r.decoded }; } },
    { key: 'astCode', label: '💻 True AST Code', family: 'exact', fidelity: 'exact', run: async (t) => { const r = compressAst(t); return { output: r.output, decoded: r.decoded }; } },
    { key: 'caveHolo', label: '🔥 CaveHolo', family: 'semantic', fidelity: 'lossy', run: async (t) => ({ output: compressCaveHolo(t).output }) },
    { key: 'ibCaveHolo', label: '🧊 IB-CaveHolo', family: 'semantic', fidelity: 'lossy', run: async (t) => ({ output: compressIbCaveHolo(t).output }) },
    { key: 'caveMan', label: '🦴 CaveMan (full)', family: 'semantic', fidelity: 'lossy', run: async (t) => ({ output: cavemanCompress(t, 'full').output }) },
    { key: 'caveManUltra', label: '🦴 CaveMan (ultra)', family: 'semantic', fidelity: 'lossy', run: async (t) => ({ output: cavemanCompress(t, 'ultra').output }) },
    { key: 'dragi', label: '🐉 DRAGI D12', family: 'semantic', fidelity: 'lossy', run: async (t) => ({ output: compressDragi(t).output }) },
    { key: 'wenyan', label: '文言文 Wenyan', family: 'semantic', fidelity: 'lossy', run: async (t) => ({ output: compressWenyan(t, 'lite').output }) },
    { key: 'composite', label: '⚡ CaveMan+DRAGI', family: 'semantic', fidelity: 'lossy', run: async (t) => ({ output: compressComposite(t).output }) },
    { key: 'dragiScale', label: '📚 DRAGI Multi', family: 'semantic', fidelity: 'lossy', run: async (t) => ({ output: compressDragiAtScale(t, 3).output }) },
    { key: 'ordos', label: '🔺 Ordos Tri-Band', family: 'semantic', fidelity: 'lossy', run: async (t) => ({ output: compileOrdosTriBand(t).output }) },
    { key: 'noether', label: '⚛ Noether CCL', family: 'semantic', fidelity: 'lossy', run: async (t) => ({ output: compileNoether(t).output }) },
    {
      key: 'hilbert',
      label: '🌌 Hilbert wave projection',
      family: 'semantic',
      fidelity: 'lossy',
      run: async (t) => {
        const m = (await import('@/lib/neuralese-hilbert')) as Record<string, unknown>;
        const fn = m.projectHilbertWave as ((s: string, k?: number) => { output: string }) | undefined;
        if (!fn) throw new Error('projectHilbertWave not exported');
        return { output: fn(t, 12).output };
      },
    }
  ];

  return base;
}

export async function measure(e: Entry, text: string, enc: EncodingName, inTokens: number): Promise<CodecRun> {
  const t0 = performance.now();
  const base: CodecRun = {
    key: e.key,
    label: e.label,
    family: e.family,
    fidelity: e.fidelity,
    output: '',
    outChars: 0,
    inTokens,
    outTokens: 0,
    savingsPct: 0,
    heuristicSavingsPct: 0,
    estimateErrorPts: 0,
    exact: null,
    tokensPerChar: 0,
    ms: 0,
    oneChatTokens: null,
  };
  try {
    const r = await e.run(text, enc);
    const outTokens = countTokens(r.output, enc);
    const hIn = heuristicTokens(text);
    const hOut = heuristicTokens(r.output);
    const real = inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0;
    const heur = hIn ? ((hIn - hOut) / hIn) * 100 : 0;
    return {
      ...base,
      output: r.output,
      outChars: r.output.length,
      outTokens,
      savingsPct: real,
      heuristicSavingsPct: heur,
      estimateErrorPts: heur - real,
      exact: r.decoded == null ? null : r.decoded === text,
      tokensPerChar: r.output.length ? outTokens / r.output.length : 0,
      ms: performance.now() - t0,
      note: r.note,
      oneChatTokens: r.oneChat ?? (r.output === text ? inTokens : null),
    };
  } catch (err) {
    return { ...base, ms: performance.now() - t0, error: (err as Error).message };
  }
}

export async function runCodecAudit(
  text: string,
  enc: EncodingName,
  deep: boolean,
  onProgress?: (done: number, total: number, label: string) => void,
): Promise<CodecRun[]> {
  const inTokens = countTokens(text, enc);
  const entries = codecEntries().filter((e) => deep || !e.deep);
  const out: CodecRun[] = [];

  const t0 = performance.now();
  try {
    const xi = await omegaXiCompress(text, enc);
    const back = await omegaXiDecode(xi.output, enc);
    const hIn = heuristicTokens(text);
    const hOut = heuristicTokens(xi.output);
    out.push({
      key: 'omega_xi',
      label: 'Ω-Ξ ATOM (this build)',
      family: 'omega-xi',
      fidelity: 'exact',
      oneChatTokens: null,
      output: xi.output,
      outChars: xi.output.length,
      inTokens,
      outTokens: xi.outTokens,
      savingsPct: xi.savingsPct,
      heuristicSavingsPct: hIn ? ((hIn - hOut) / hIn) * 100 : 0,
      estimateErrorPts: (hIn ? ((hIn - hOut) / hIn) * 100 : 0) - xi.savingsPct,
      exact: back === text,
      tokensPerChar: xi.output.length ? xi.outTokens / xi.output.length : 0,
      ms: performance.now() - t0,
      note: `${xi.codecName} · ${xi.bitsPerAtom} bit/atom · 1 tok/atom=${xi.invariantHolds}`,
    });
  } catch (err) {
    out.push({
      key: 'omega_xi',
      label: 'Ω-Ξ ATOM (this build)',
      family: 'omega-xi',
      fidelity: 'exact',
      oneChatTokens: null,
      output: '',
      outChars: 0,
      inTokens,
      outTokens: 0,
      savingsPct: 0,
      heuristicSavingsPct: 0,
      estimateErrorPts: 0,
      exact: false,
      tokensPerChar: 0,
      ms: performance.now() - t0,
      error: (err as Error).message,
    });
  }
  onProgress?.(1, entries.length + 1, 'Ω-Ξ ATOM');

  let i = 1;
  for (const e of entries) {
    out.push(await measure(e, text, enc, inTokens));
    i++;
    onProgress?.(i, entries.length + 1, e.label);
    await new Promise((r) => setTimeout(r, 0));
  }
  return out;
}