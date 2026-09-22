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
  run: (text: string, enc: EncodingName) => Promise<{ output: string; decoded?: string | null; note?: string }>;
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
      key: 'rosetta',
      label: '𓋹 ROSETTA-R4.2',
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

async function measure(e: Entry, text: string, enc: EncodingName, inTokens: number): Promise<CodecRun> {
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