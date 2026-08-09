// Neuralese IB-CaveHolo — Information Bottleneck + Protected Semantic Units + CaveHolo
//
// Orthogonal axes (compound multiplicatively when independent):
//   Axis A — Semantic Unit Protection (Chinese "基础语义单元" literature):
//     Never break multi-token critical units (numbers, URLs, emails, code spans,
//     quoted strings). Protect → compress rest → restore. Prevents 2009→209-style
//     damage that Selective-Context-style compressors risk.
//
//   Axis B — Sentence-level Information Bottleneck (Tishby IB / RDT):
//     Compress X while preserving relevant information. Without an external query Y,
//     we use *self-relevance*: sentence Zipf/content density as a proxy for I(X;Y)
//     when Y = "downstream task fidelity". Drop only the lowest-density sentences
//     when (1) they carry no protected units and (2) remaining text still covers
//     high-density content. Restore original order of survivors.
//
//   Axis C — CaveHolo (grammar drop + holographic anchors):
//     Existing Pareto leader. Applied last on the IB-pruned, unit-protected body.
//
// Production-adjacent grounding:
//   - Tishby Information Bottleneck / Rate-Distortion (classic; still used in 2025–26
//     LLM compression analyses, e.g. "From Tokens to Thoughts" arXiv:2505.17117).
//   - Chinese prompt-compression surveys: protect basic semantic units (numbers,
//     entities) before token pruning (CSDN/LLMLingua Chinese writeups).
//   - OneUptime Token Budget Allocator (2026): priority-weighted retention under
//     a budget — here sentences get priority = density × hasProtectedUnits.
//
// Honest: IB sentence prune is lossy. Protected units are exact. CaveHolo stage
// remains lossy on grammar. Combined decoder explains all three stages.

import { compressCaveHolo } from "./neuralese-caveholo";
import { estimateTokensBPE } from "./neuralese-metrics";

export interface IbCaveHoloResult {
  output: string;
  stats: {
    realInTokens: number;
    realOutTokens: number;
    realSavingsPct: number;
    protectedUnits: number;
    sentencesDropped: number;
    sentencesKept: number;
    caveHoloSavings: number;
    ibSavings: number;
  };
  decoderPrompt: string;
}

const PROTECT_PATTERNS: RegExp[] = [
  /```[\s\S]*?```/g, // fenced code
  /`[^`\n]+`/g, // inline code
  /https?:\/\/[^\s)>"']+/g, // URLs
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // emails
  /"[^"\n]{2,}"/g, // double-quoted strings
  /'[^'\n]{2,}'/g, // single-quoted strings
  /\b\d+(?:\.\d+)?%?\b/g, // numbers / percents
  /\b[A-Z]{2,}[A-Za-z0-9_-]*\b/g, // ACRONYMS / API_KEYS-ish
  /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g, // CamelCase identifiers
];

function protectUnits(text: string): { protected: string; units: string[] } {
  const units: string[] = [];
  let out = text;
  // Apply patterns longest-first by replacing matches with placeholders
  // Run multiple patterns sequentially; later patterns see placeholders as opaque.
  for (const re of PROTECT_PATTERNS) {
    out = out.replace(re, (m) => {
      // Avoid double-protecting placeholders
      if (/^§U\d+§$/.test(m)) return m;
      const id = units.length;
      units.push(m);
      return `§U${id}§`;
    });
  }
  return { protected: out, units };
}

function restoreUnits(text: string, units: string[]): string {
  let out = text;
  // Restore reverse order so §U10§ doesn't collide with §U1§
  for (let i = units.length - 1; i >= 0; i--) {
    out = out.split(`§U${i}§`).join(units[i]!);
  }
  return out;
}

function sentenceSplit(text: string): string[] {
  return text
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function contentDensity(sentence: string): number {
  const tokens = sentence.split(/\s+/).filter(Boolean);
  if (!tokens.length) return 0;
  let score = 0;
  for (const t of tokens) {
    const bare = t.replace(/[^A-Za-z0-9-]/g, "").toLowerCase();
    if (!bare) continue;
    // Protected placeholders are infinitely dense
    if (/^§u\d+§$/i.test(bare) || /^§U\d+§$/.test(t)) {
      score += 10;
      continue;
    }
    // Longer content words score higher (Zipf proxy)
    if (bare.length >= 5) score += 2;
    else if (bare.length >= 3) score += 1;
  }
  return score / tokens.length;
}

function hasProtected(sentence: string): boolean {
  return /§U\d+§/.test(sentence);
}

/**
 * IB sentence prune: drop lowest-density sentences without protected units,
 * keep at least keepFloor of sentences, never drop if only one sentence.
 */
function ibPruneSentences(text: string, dropFrac = 0.2, keepFloor = 0.7): {
  text: string;
  dropped: number;
  kept: number;
} {
  const sents = sentenceSplit(text);
  if (sents.length <= 2) {
    return { text, dropped: 0, kept: sents.length };
  }

  const scored = sents.map((s, i) => ({
    s,
    i,
    d: contentDensity(s),
    prot: hasProtected(s),
  }));

  // Never drop protected-bearing sentences
  const droppable = scored
    .filter((x) => !x.prot)
    .sort((a, b) => a.d - b.d); // lowest density first

  const maxDrop = Math.max(
    0,
    Math.min(
      Math.floor(sents.length * dropFrac),
      sents.length - Math.ceil(sents.length * keepFloor),
    ),
  );

  const dropIdx = new Set(droppable.slice(0, maxDrop).map((x) => x.i));
  const kept = scored.filter((x) => !dropIdx.has(x.i)).sort((a, b) => a.i - b.i);
  return {
    text: kept.map((x) => x.s).join(" "),
    dropped: dropIdx.size,
    kept: kept.length,
  };
}

export function compressIbCaveHolo(text: string): IbCaveHoloResult {
  const realInTokens = estimateTokensBPE(text);
  if (!text.trim()) {
    return {
      output: text,
      stats: {
        realInTokens: 0,
        realOutTokens: 0,
        realSavingsPct: 0,
        protectedUnits: 0,
        sentencesDropped: 0,
        sentencesKept: 0,
        caveHoloSavings: 0,
        ibSavings: 0,
      },
      decoderPrompt: "",
    };
  }

  // 1. Protect critical multi-token semantic units
  const { protected: protectedText, units } = protectUnits(text);

  // 2. IB sentence prune on protected text
  const pruned = ibPruneSentences(protectedText);
  const afterIbTok = estimateTokensBPE(pruned.text);
  const ibSavings = realInTokens
    ? Math.round(((realInTokens - afterIbTok) / realInTokens) * 100)
    : 0;

  // 3. CaveHolo on pruned protected body
  const ch = compressCaveHolo(pruned.text);
  const afterChTok = estimateTokensBPE(ch.output);

  // 4. Restore protected units
  const restored = restoreUnits(ch.output, units);
  // Also restore on pruned path if CaveHolo expanded somehow (shouldn't)
  const finalOutput = restored;
  const realOutTokens = estimateTokensBPE(finalOutput);
  const realSavingsPct = realInTokens
    ? Math.round(((realInTokens - realOutTokens) / realInTokens) * 100)
    : 0;

  // Prefer IB-CaveHolo only if it beats plain CaveHolo on original
  const plain = compressCaveHolo(text);
  const plainTok = estimateTokensBPE(plain.output);
  const useNew = realOutTokens < plainTok || (realOutTokens === plainTok && pruned.dropped > 0);
  const output = useNew ? finalOutput : plain.output;
  const outTok = useNew ? realOutTokens : plainTok;
  const sav = realInTokens ? Math.round(((realInTokens - outTok) / realInTokens) * 100) : 0;

  return {
    output,
    stats: {
      realInTokens,
      realOutTokens: outTok,
      realSavingsPct: sav,
      protectedUnits: units.length,
      sentencesDropped: useNew ? pruned.dropped : 0,
      sentencesKept: useNew ? pruned.kept : sentenceSplit(text).length,
      caveHoloSavings: ch.stats.realSavingsPct,
      ibSavings: useNew ? ibSavings : 0,
    },
    decoderPrompt: [
      "# IB-CAVEHOLO DECODER (Information Bottleneck + Protected Units + CaveHolo)",
      "Stages applied (when active):",
      "1. Protected semantic units (numbers, URLs, code, quotes, CamelCase) were masked as §Un§ then restored.",
      "2. Low-density sentences without protected units may have been dropped (IB self-relevance prune).",
      "3. CaveMan stripped predictable grammar; Holographic may have aliased repeated anchors as $codes.",
      "If [BND:...] is present, expand $codes first, then rehydrate CaveMan grammar, then treat §Un§ as already restored.",
      "Do not invent facts for dropped low-density sentences.",
    ].join("\n"),
  };
}
