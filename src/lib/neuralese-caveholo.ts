// Neuralese CaveHolo Pipeline — CaveMan→Holographic Two-Stage Compression
//
// Novel Pareto-superior combination (this codebase, Jul 2026):
//   Stage 1: CaveMan strips predictable grammar words (articles, copulas, etc.)
//            preserving all content words, negations, and connectives.
//   Stage 2: Holographic encodes repeated content anchors in the CaveMan output
//            as exact $code boundary references with MDL gate.
//
// Why this is Pareto-superior to either alone:
//   - CaveMan alone: ~18% savings on sample, ~25% on short. No anchor aliasing.
//   - Holographic alone: 0-15% on prose (needs repetition). Exact but limited.
//   - CaveHolo: CaveMan savings + holographic bonus on reduced body. The grammar
//     stripping creates a denser token stream where repeated anchors are closer
//     together and more frequent relative to total, improving holographic yield.
//
// Properties:
//   - Stage 1 is lossy (grammar words dropped, LLM-recoverable)
//   - Stage 2 is exact on the stage-1 output (MDL-gated boundary aliasing)
//   - Combined decoder preamble covers both stages
//   - ASCII-safe, cross-LLM compatible

import { cavemanCompress } from "./neuralese-caveman";
import { compressHolographic, decodeHolographic } from "./neuralese-holographic";
import { estimateTokensBPE } from "./neuralese-metrics";

export interface CaveHoloResult {
  output: string;
  stats: {
    realInTokens: number;
    realOutTokens: number;
    realSavingsPct: number;
    stage1Savings: number; // CaveMan contribution
    stage2Savings: number; // Holographic contribution
    anchorCount: number;
    holoAccepted: boolean;
  };
  decoderPrompt: string;
}

export function compressCaveHolo(text: string): CaveHoloResult {
  const realInTokens = estimateTokensBPE(text);

  // Stage 1: CaveMan full
  const cave = cavemanCompress(text);
  const stage1Tok = estimateTokensBPE(cave.output);
  const stage1Savings = realInTokens
    ? Math.round(((realInTokens - stage1Tok) / realInTokens) * 100)
    : 0;

  // Stage 2: Holographic on CaveMan output
  const holo = compressHolographic(cave.output);
  const stage2Tok = estimateTokensBPE(holo.output);
  const stage2Savings = stage1Tok
    ? Math.round(((stage1Tok - stage2Tok) / stage1Tok) * 100)
    : 0;

  // Pick the denser of: cave-only or cave→holo
  const useBoth = holo.isCompressed && stage2Tok < stage1Tok;
  const finalOutput = useBoth ? holo.output : cave.output;
  const finalTok = useBoth ? stage2Tok : stage1Tok;
  const realSavingsPct = realInTokens
    ? Math.round(((realInTokens - finalTok) / realInTokens) * 100)
    : 0;

  return {
    output: finalOutput,
    stats: {
      realInTokens,
      realOutTokens: finalTok,
      realSavingsPct,
      stage1Savings,
      stage2Savings: useBoth ? stage2Savings : 0,
      anchorCount: useBoth ? holo.anchors.length : 0,
      holoAccepted: useBoth,
    },
    decoderPrompt: [
      "# CAVEHOLO TWO-STAGE DECODER",
      "This text was compressed in two stages:",
      "1. CaveMan: articles, copulas, auxiliaries, and filler words were stripped.",
      "   Restore them mentally while reading.",
      useBoth
        ? "2. Holographic: repeated concept anchors were aliased as $code references."
        : "2. Holographic stage was MDL-rejected (no repeated anchors); skip this step.",
      useBoth
        ? "   Parse [BND:$code=term,...] header and expand $codes to their terms."
        : "",
      "Read the result as compressed but semantically complete prose.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
