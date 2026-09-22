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
    encodeFn: (t: string, e: EncodingName) => { wire: string; decoded: string; exact: boolean; outTokens: number },
  ) => {
    try {
      const res = encodeFn(text, enc);
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

  await evalCodec('rosetta', async (t, e) => {
    const r = await rosettaEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  evalCodec('astral', (t, e) => {
    const r = astralEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  evalCodec('aeon', (t, e) => {
    const r = aeonEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  evalCodec('phoenix', (t, e) => {
    const r = phoenixEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  evalCodec('valkyrie', (t, e) => {
    const r = valkyrieEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  evalCodec('solaris', (t, e) => {
    const r = solarisEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  evalCodec('hyperion', (t, e) => {
    const r = hyperionEncode(t, e);
    return { wire: r.wire, decoded: r.decoded, exact: r.exact, outTokens: r.outTokens };
  });

  evalCodec('valence', (t, e) => {
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
