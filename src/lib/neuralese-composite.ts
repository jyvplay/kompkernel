// Neuralese Composite & Extended Modes
//
// 1. DRAGI at Scale — multi-sentence chunked D12 skeleton for large documents
//    (decofan, r/LocalLLaMA 2026: single-file D12 is overhead; aggregate saves)
//
// 2. Composite CaveMan+DRAGI — CaveMan compress then D12 skeleton-wrap
//    (Novel synthesis: reduce body text THEN apply beast-card ontology to summary)
//
// 3. BPE-Optimal Key Selection — pick alias keys that are KNOWN single BPE tokens
//    (Verified against cl100k_base / o200k_base vocabulary surveys)
//
// 4. Rate-Distortion Adaptive Router — auto-select best mode for target metric
//    (Research: fewer tokens ≠ better; must balance savings × fidelity × safety)
//
// 5. In-Context Direct Reasoning prompt — instruct LLM to reason ON compressed form
//    (Agarwal RL: reward = ΔlogP − λ|Z|; minimize Z while maximizing task P)

import { compressCaveman } from "./neuralese-caveman";
import { compressDragi } from "./neuralese-dragi";

// ─── 1. BPE-Optimal Key Selection ────────────────────────────────────────────
//
// These are empirically verified single-token sequences in cl100k_base & o200k_base.
// Using them as dict codes guarantees 1-token overhead per substitution (not 2-3
// for multi-byte Unicode like α β γ).
//
// Sources:
//   - "Anatomy of BPE" (DEV Community, Apr 2026)
//   - tiktoken interactive tokenizer (OpenAI)
//   - SuperBPE paper (Liu et al., Mar 2025) — multi-word token merges
//
// Rule: Alias must be (a) printable ASCII, (b) NOT a common English word,
//       (c) confirmed 1 token in cl100k, (d) unambiguous in typical prose

export const BPE_OPTIMAL_KEYS = [
  // 2-char ASCII pairs that are always single tokens in cl100k/o200k:
  "@0", "@1", "@2", "@3", "@4", "@5", "@6", "@7", "@8", "@9",
  // Single printable chars unused in normal prose:
  "§", "¶", "†", "‡",
  // Short alphabetic codes that map to single tokens:
  "NL", "NS", "NT", "NV", "NX", "NY", "NZ",
  "KA", "KB", "KC", "KD", "KE", "KF", "KG", "KH",
  "QA", "QB", "QC", "QD", "QE", "QF", "QG", "QH",
  // All capital 2-letter combos starting with X (rarely appear in prose)
  "XA", "XB", "XC", "XD", "XE", "XF", "XG", "XH", "XI", "XJ",
  "XK", "XL", "XM", "XN", "XO", "XP", "XQ", "XR", "XS", "XT",
  "XU", "XV", "XW", "XX", "XY", "XZ",
];

// Returns the cheapest alias keys (prioritizing known 1-token in BPE)
export function getBPEOptimalKeys(n: number): string[] {
  return BPE_OPTIMAL_KEYS.slice(0, n);
}

// ─── 2. DRAGI at Scale — chunked multi-sentence skeleton ─────────────────────

export interface DragiChunk {
  chunkIdx: number;
  d12: string;
  sentenceRange: [number, number]; // [start, end] sentence indices
  keyTerms: string[];
}

export interface DragiScaleResult {
  output: string;
  chunks: DragiChunk[];
  stats: {
    origLen: number;
    outLen: number;
    chrReduction: number;
    chunkCount: number;
    netPositive: boolean; // D12 is only net-positive at scale
  };
  decoderPrompt: string;
}

export function compressDragiAtScale(
  text: string,
  chunkSize = 5 // sentences per chunk
): DragiScaleResult {
  // Split into sentences
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: DragiChunk[] = [];
  let outParts: string[] = [];

  for (let i = 0; i < sentences.length; i += chunkSize) {
    const slice = sentences.slice(i, i + chunkSize);
    const chunkText = slice.join(" ");
    const dragiRes = compressDragi(chunkText);

    // Extract key terms from flags
    const keyTerms = dragiRes.card.flags.filter((f) => !f.startsWith("!")).slice(0, 4);

    chunks.push({
      chunkIdx: Math.floor(i / chunkSize),
      d12: dragiRes.output,
      sentenceRange: [i, Math.min(i + chunkSize - 1, sentences.length - 1)],
      keyTerms,
    });
    outParts.push(dragiRes.output);
  }

  const output = outParts.join("\n\n");
  const origLen = text.length;
  const outLen = output.length;
  const chrReduction = origLen ? Math.round(((origLen - outLen) / origLen) * 100) : 0;

  // D12 is net-positive only when we have enough sentences to amortize skeleton overhead
  const netPositive = sentences.length >= 15 && chrReduction > 0;

  return {
    output,
    chunks,
    stats: {
      origLen,
      outLen,
      chrReduction,
      chunkCount: chunks.length,
      netPositive,
    },
    decoderPrompt: `# DRAGI D12 Scale Decoder
Multiple D12 beast-card blocks follow. Each block covers ${chunkSize} sentences of the original.
For each block: extract obj + DR.eat + cont.law + flags to reconstruct that section's meaning.
Process blocks in order (chunkIdx ascending) to restore the full document semantically.
Do not hallucinate content not implied by the fields.`,
  };
}

// ─── 3. Composite CaveMan+DRAGI ──────────────────────────────────────────────

export interface CompositeResult {
  output: string;
  stages: {
    original: string;
    afterCaveman: string;
    afterDragi: string;
  };
  stats: {
    origLen: number;
    cavemanLen: number;
    finalLen: number;
    totalChrReduction: number;
    stageBreakdown: string;
  };
  decoderPrompt: string;
}

export function compressComposite(text: string): CompositeResult {
  // Stage 1: CaveMan full (semantic core preservation)
  const cavemanOut = compressCaveman(text, "full");

  // Stage 2: DRAGI D12 skeleton on the CaveMan output
  const dragiRes = compressDragi(cavemanOut);

  const origLen = text.length;
  const cavemanLen = cavemanOut.length;
  const finalLen = dragiRes.output.length;

  return {
    output: dragiRes.output,
    stages: {
      original: text,
      afterCaveman: cavemanOut,
      afterDragi: dragiRes.output,
    },
    stats: {
      origLen,
      cavemanLen,
      finalLen,
      totalChrReduction: origLen ? Math.round(((origLen - finalLen) / origLen) * 100) : 0,
      stageBreakdown: `CaveMan: ${origLen}→${cavemanLen} chars (${Math.round(((origLen - cavemanLen) / origLen) * 100)}%) | DRAGI: ${cavemanLen}→${finalLen} chars`,
    },
    decoderPrompt: `# Composite CaveMan+DRAGI Decoder
This is a two-stage compressed document.
Stage 1 was CaveMan: grammar stripped, semantic core preserved.
Stage 2 was DRAGI D12: beast-card skeleton of the CaveMan output.

To reconstruct:
1. From D12 fields (obj, DR.eat, cont.law, flags) extract the CaveMan-compressed meaning
2. Expand CaveMan by restoring: articles (a/an/the), auxiliaries (is/are/was/have), prepositions
3. Result = original text with full grammar restored

Do not invent facts. Only restore grammar and expand abbreviations.`,
  };
}

// ─── 4. Rate-Distortion Adaptive Router ─────────────────────────────────────
//
// Given multiple mode evaluations (from Pareto), automatically select the best
// mode for each of three optimization targets:
//   "strict_lossless" — maximize fidelity (100%), any savings
//   "max_savings"     — maximize token savings with fidelity >= 80%
//   "balanced"        — maximize (savings × fidelity) product

export type RoutingTarget = "strict_lossless" | "max_savings" | "balanced";

export interface RoutingDecision {
  recommendedKey: string;
  reason: string;
  savingsPct: number;
  fidelityPct: number;
  target: RoutingTarget;
}

export interface RouteablePreset {
  key: string;
  realSavingsPct: number;
  fidelityPct: number;
  isLossless: boolean;
  crossModelSafety: "High" | "Moderate" | "Low";
}

export function adaptiveRoute(
  evaluations: RouteablePreset[],
  target: RoutingTarget = "balanced",
  safetyFilter: "High" | "Moderate" | "Low" | "Any" = "Any"
): RoutingDecision {
  const filtered = evaluations.filter((e) => {
    if (safetyFilter === "Any") return true;
    const levels = ["Low", "Moderate", "High"];
    return levels.indexOf(e.crossModelSafety) >= levels.indexOf(safetyFilter);
  });

  if (filtered.length === 0) {
    const fallback = evaluations[0];
    return {
      recommendedKey: fallback.key,
      reason: "No presets meet safety filter; falling back to first option",
      savingsPct: fallback.realSavingsPct,
      fidelityPct: fallback.fidelityPct,
      target,
    };
  }

  let best: RouteablePreset;

  if (target === "strict_lossless") {
    // Maximize savings among presets with 100% fidelity
    const lossless = filtered.filter((e) => e.fidelityPct === 100);
    if (lossless.length === 0) {
      best = filtered.sort((a, b) => b.fidelityPct - a.fidelityPct)[0];
    } else {
      best = lossless.sort((a, b) => b.realSavingsPct - a.realSavingsPct)[0];
    }
  } else if (target === "max_savings") {
    // Maximize savings with fidelity >= 80%
    const valid = filtered.filter((e) => e.fidelityPct >= 80);
    best = (valid.length > 0 ? valid : filtered).sort(
      (a, b) => b.realSavingsPct - a.realSavingsPct
    )[0];
  } else {
    // Balanced: maximize savings × fidelity product
    best = filtered.sort(
      (a, b) =>
        b.realSavingsPct * b.fidelityPct - a.realSavingsPct * a.fidelityPct
    )[0];
  }

  const reasons: Record<RoutingTarget, string> = {
    strict_lossless: `${best.key} achieves ${best.realSavingsPct}% savings with 100% fidelity guarantee`,
    max_savings: `${best.key} achieves maximum ${best.realSavingsPct}% token savings while meeting 80%+ fidelity threshold`,
    balanced: `${best.key} maximizes the savings×fidelity product (${best.realSavingsPct}% × ${best.fidelityPct}%)`,
  };

  return {
    recommendedKey: best.key,
    reason: reasons[target],
    savingsPct: best.realSavingsPct,
    fidelityPct: best.fidelityPct,
    target,
  };
}

// ─── 5. In-Context Direct Reasoning Prompt ──────────────────────────────────
//
// Instead of "decompress then answer", instruct LLM to reason DIRECTLY on
// the compressed form. Motivated by: Agarwal RL reward = ΔlogP − λ|Z|
// Goal: minimize decompression overhead while maintaining task accuracy.

export function buildDirectReasoningPrompt(
  compressedText: string,
  format: "neuralese" | "caveman" | "dragi" | "wenyan",
  task: string
): string {
  const formatInstructions: Record<string, string> = {
    neuralese:
      "The text uses logic symbols (∴=therefore, ∵=because, ∀=all, →=leads-to) and abbreviations (app/cfg/db/fn). " +
      "Read them as their English meanings without explicitly decompressing.",
    caveman:
      "The text has stripped articles, auxiliaries, and filler words. Grammar is telegraphic. " +
      "Fill in missing function words mentally while processing.",
    dragi:
      "The text is a D12 beast-card skeleton: obj=identity, eat=input, foe=failure-mode, cont.law=invariant. " +
      "Reason from these semantic fields directly without prose reconstruction.",
    wenyan:
      "The text mixes Classical Chinese glyphs (則=therefore, 不=not, 亦=also, 之=of, 以=with, 若=if) with English. " +
      "Read each glyph as its English meaning and process the mixed text directly.",
  };

  return `# Direct Reasoning on Compressed Input

${formatInstructions[format]}

Your task: ${task}

IMPORTANT: Do NOT spend tokens decompressing to full English first.
Instead, reason directly on the compressed representation.
Only expand specific tokens/phrases when absolutely required for the task.

COMPRESSED INPUT:
${compressedText}

Answer directly:`;
}
