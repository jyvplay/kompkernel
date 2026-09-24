/**
 * src/lib/omega/codec-synthesis.ts
 * =============================================================================
 * DYNAMIC PARADIGM SYNTHESIS & REAL-TIME EVALUATION
 *
 * Runs dynamic benchmark comparisons across all active candidate codecs:
 * - ASTRAL-A1 (Adaptive Structural Collocation Encoding)
 * - AEON-A1 (Dynamic Attractor Frame Delta Encoding)
 * - PHOENIX-P1 (Poly-Disjoint Topological Motif Extraction)
 * - VALKYRIE-V1 (Degenerate Lattice Subgraph Contracting)
 * - SOLARIS-S1 (Spectral Orthogonal Basis Projection)
 * - HYPERION-H1 (Hyper-Dimensional Spectral Orbit Contraction)
 * - VALENCE-V1 (Factoradix Permutation-Rank Encoding)
 * - ROSETTA-R5.6 / R6 (Unified Notational Transposition Engine)
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { telosEncode, telosDecode, type TelosResult } from './telos';
import { archeEncode, archeDecode, type ArcheResult } from './arche';
import { genesisEncode, genesisDecode, type GenesisResult } from './genesis';
import { omniEncode, omniDecode, type OmniResult } from './omni';
import { khorosEncode, khorosDecode, type KhorosResult } from './khoros';
import { kairosEncode } from './kairos';
import { anankeEncode } from './ananke';
import { moiraEncode } from './moira';
import { nemesisEncode } from './nemesis';
import { themisEncode } from './themis';
import { dikeEncode } from './dike';
import { eupraxiaEncode } from './eupraxia';
import { metisEncode } from './metis';
import { proteusEncode } from './proteus';
import { pantheonEncode, pantheonDecode, type PantheonResult } from './pantheon';
import { apeironEncode, apeironDecode, type ApeironResult } from './apeiron';
import { noesisEncode, noesisDecode, type NoesisResult } from './noesis';
import { synapseEncode, synapseDecode, type SynapseResult } from './synapse';
import { panaceaEncode, panaceaDecode, type PanaceaResult } from './panacea';
import { aetherEncode, aetherDecode, type AetherResult } from './aether';
import { harmoniaEncode, harmoniaDecode, type HarmoniaResult } from './harmonia';
import { rosettaEncode, rosettaDecode, type RosettaResult } from './rosetta';
import { astralEncode, astralDecode } from './astral';
import { aeonEncode, aeonDecode } from './aeon';
import { phoenixEncode, phoenixDecode } from './phoenix';
import { valkyrieEncode, valkyrieDecode } from './valkyrie';
import { solarisEncode, solarisDecode } from './solaris';
import { hyperionEncode, hyperionDecode } from './hyperion';
import { valenceEncode, valenceDecode } from './valence';

export interface CodecEvaluationRun {
  key: string;
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
}

export interface SynthesisSummary {
  inputTokens: number;
  runs: CodecEvaluationRun[];
  winnerKey: string;
  winnerTokens: number;
  isParetoOptimal: boolean;
}

export async function evaluateAllCodecsDynamically(
  text: string,
  enc: EncodingName = 'o200k_base',
): Promise<SynthesisSummary> {
  const inTokens = countTokens(text, enc);
  const runs: CodecEvaluationRun[] = [];

  const evalCodec = async (
    key: string,
    encodeFn: (t: string, e: EncodingName) => Promise<{ wire: string; decoded: string; exact: boolean; outTokens: number }> | { wire: string; decoded: string; exact: boolean; outTokens: number },
  ) => {
    try {
      const res = await encodeFn(text, enc);
      const outTokens = res.outTokens;
      runs.push({
        key,
        wire: res.wire,
        decoded: res.decoded,
        exact: res.exact && res.decoded === text,
        inTokens,
        outTokens,
        savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
      });
    } catch {
      runs.push({
        key,
        wire: text,
        decoded: text,
        exact: false,
        inTokens,
        outTokens: inTokens,
        savingsPct: 0,
      });
    }
  };

  await evalCodec('proteus', async (t, e) => { const r = await proteusEncode(t, e); return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens }; });

  await evalCodec('metis', async (t, e) => { const r = await metisEncode(t, e); return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens }; });

  await evalCodec('eupraxia', async (t, e) => { const r = await eupraxiaEncode(t, e); return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens }; });

  await evalCodec('dike', async (t, e) => { const r = await dikeEncode(t, e); return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens }; });

  await evalCodec('themis', async (t, e) => { const r = await themisEncode(t, e); return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens }; });

  await evalCodec('nemesis', async (t, e) => { const r = await nemesisEncode(t, e); return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens }; });

  await evalCodec('moira', async (t, e) => { const r = await moiraEncode(t, e); return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens }; });

  await evalCodec('ananke', async (t, e) => { const r = await anankeEncode(t, e); return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens }; });

  await evalCodec('kairos', async (t, e) => { const r = await kairosEncode(t, e); return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens }; });

  await evalCodec('khoros', async (t, e) => {
    const r = await khorosEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  await evalCodec('omni', async (t, e) => {
    const r = await omniEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  await evalCodec('genesis', async (t, e) => {
    const r = await genesisEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  await evalCodec('arche', async (t, e) => {
    const r = await archeEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  await evalCodec('telos', async (t, e) => {
    const r = await telosEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  await evalCodec('pantheon', async (t, e) => {
    const r = await pantheonEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  await evalCodec('apeiron', async (t, e) => {
    const r = await apeironEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  await evalCodec('noesis', async (t, e) => {
    const r = await noesisEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  await evalCodec('synapse', async (t, e) => {
    const r = await synapseEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  await evalCodec('panacea', async (t, e) => {
    const r = await panaceaEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  await evalCodec('aether', async (t, e) => {
    const r = await aetherEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  await evalCodec('harmonia', async (t, e) => {
    const r = await harmoniaEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  await evalCodec('rosetta', async (t, e) => {
    const r = await rosettaEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  await evalCodec('astral', (t, e) => {
    const r = astralEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  await evalCodec('aeon', (t, e) => {
    const r = aeonEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  await evalCodec('phoenix', (t, e) => {
    const r = phoenixEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  await evalCodec('valkyrie', (t, e) => {
    const r = valkyrieEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  await evalCodec('solaris', (t, e) => {
    const r = solarisEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  await evalCodec('hyperion', (t, e) => {
    const r = hyperionEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  await evalCodec('valence', (t, e) => {
    const r = valenceEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  const exactRuns = runs.filter((r) => r.exact);
  const winner = exactRuns.reduce((prev, curr) => (curr.outTokens < prev.outTokens ? curr : prev), runs[0]);

  return {
    inputTokens: inTokens,
    runs,
    winnerKey: winner.key,
    winnerTokens: winner.outTokens,
    isParetoOptimal: winner.outTokens <= inTokens,
  };
}
