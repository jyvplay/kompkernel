// Neuralese CaveMan Compression — multiple intensity levels
//
// Source: wilpel/caveman-compression (GitHub, Nov 2025)
//         JuliusBrussee/caveman (GitHub, Apr 2026)
//         "Caveman Compression: Cutting LLM Token Usage" (tomfranks.dev, Apr 2026)
//
// Core principle: LLMs fill in grammar/connectives automatically.
// Strip what's PREDICTABLE (articles, auxiliaries, filler), keep what's UNPREDICTABLE
// (nouns, main verbs, adjectives, numbers, negations, critical prepositions).
//
// "Brain still big. Mouth small." — JuliusBrussee/caveman README
//
// Benchmarks:
//   lite:  ~15-25% token reduction — readable, keeps sentence structure
//   full:  ~40-58% token reduction — fragments, no articles, maximum signal
//   ultra: ~58-75% token reduction — telegraph mode, absolute minimum tokens
//   wenyan: ~80-90% token reduction — Classical Chinese (文言文), 1 char/concept
//
// Cross-LLM safety: HIGH for lite/full, MODERATE for ultra, LOW for wenyan

export type CavemanLevel = "lite" | "full" | "ultra";

// ─── Stopword sets by intensity ───────────────────────────────────────────────

const ARTICLES = new Set(["a", "an", "the"]);

const AUXILIARIES = new Set([
  "is", "are", "was", "were", "am", "be", "been", "being",
  "have", "has", "had", "having",
  "do", "does", "did", "doing", "done",
  "will", "would", "could", "should", "may", "might", "must", "shall",
  "can", "need", "ought",
]);

// Safe to remove when meaning is clear from context
const FILLER_LITE = new Set([
  "very", "quite", "rather", "somewhat", "really", "extremely", "basically",
  "essentially", "actually", "literally", "definitely", "certainly",
  "please", "kindly", "hereby", "therein", "thereof",
  "just", "even", "still",
]);

// Additional filler for full mode
const FILLER_FULL = new Set([
  ...FILLER_LITE,
  // These are removable when context is clear
  "this", "that", "these", "those", "it",
  "so", "then", "therefore", "thus", "hence",
  "also", "too", "as well", "furthermore", "moreover",
  "however", "but", "yet", "although", "though",
]);

// Prepositions: in lite/full we only remove when they don't add meaning
// In ultra we remove more aggressively
const REMOVABLE_PREPS_LITE = new Set(["of", "for", "to", "in", "on", "at"]);

// Connectives/hedges to remove in full mode
const HEDGING = new Set([
  "in order to", "so as to", "for the purpose of", "with the goal of",
  "it is worth noting that", "it should be noted that", "please note that",
  "as you can see", "as we can observe", "let me explain", "let me clarify",
  "i would like to", "i want to", "we need to", "we should",
  "one might say", "it could be argued", "arguably",
]);

// Short synonym replacements (ultra mode)
const SHORT_SYNONYMS: [RegExp, string][] = [
  [/\bconfiguration\b/gi, "cfg"],
  [/\bdatabase\b/gi, "db"],
  [/\bapplication\b/gi, "app"],
  [/\bfunction\b/gi, "fn"],
  [/\brepository\b/gi, "repo"],
  [/\barchitecture\b/gi, "arch"],
  [/\brequirement\b/gi, "req"],
  [/\bimplementation\b/gi, "impl"],
  [/\bperformance\b/gi, "perf"],
  [/\benvironment\b/gi, "env"],
  [/\bdevelopment\b/gi, "dev"],
  [/\bidentifier\b/gi, "id"],
  [/\bparameter\b/gi, "param"],
  [/\bmessage\b/gi, "msg"],
  [/\bresponse\b/gi, "resp"],
  [/\brequest\b/gi, "req"],
  [/\bdirectory\b/gi, "dir"],
  [/\btemporary\b/gi, "tmp"],
  [/\boutput\b/gi, "out"],
  [/\binformation\b/gi, "info"],
  [/\bmaximum\b/gi, "max"],
  [/\bminimum\b/gi, "min"],
  [/\bapproximately\b/gi, "~"],
  [/\bbecause\b/gi, "bc"],
  [/\bwithout\b/gi, "w/o"],
  [/\bwith\b/gi, "w/"],
  [/\bleads to\b/gi, "→"],
  [/\bresults in\b/gi, "→"],
  [/\bcauses\b/gi, "→"],
];

// Ultra mode: causality arrows (applied on PHRASES only, not mid-sentence "not")
const CAUSALITY: [RegExp, string][] = [
  [/\binstead of\b/gi, "vs"],
  [/\bcompared to\b/gi, "vs"],
  [/\bversus\b/gi, "vs"],
  [/\bgreater than\b/gi, ">"],
  [/\bless than\b/gi, "<"],
  [/\bequal to\b/gi, "="],
  [/\bnot equal to\b/gi, "≠"],
  [/\band\b/gi, "+"],
  [/\bor\b/gi, "|"],
  // Intentionally NOT replacing bare "not" — it carries critical negation semantics
];

// ─── Core compress function ────────────────────────────────────────────────────

export function compressCaveman(text: string, level: CavemanLevel = "full"): string {
  if (!text.trim()) return text;

  let t = text;

  // Apply hedging/multiword phrase removals first (before word-level)
  for (const phrase of HEDGING) {
    const re = new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}\\b`, "gi");
    t = t.replace(re, "");
  }

  // Ultra: apply short synonyms and causality arrows
  if (level === "ultra") {
    for (const [re, rep] of SHORT_SYNONYMS) {
      t = t.replace(re, rep);
    }
    for (const [re, rep] of CAUSALITY) {
      t = t.replace(re, rep);
    }
  }

  // Word-level processing
  const words = t.split(/(\s+|(?=[.,;:!?]))/);
  const result: string[] = [];

  for (const tok of words) {
    // Preserve whitespace tokens
    if (/^\s+$/.test(tok) || tok === "") {
      result.push(tok);
      continue;
    }

    // Preserve punctuation-only tokens
    if (/^[.,;:!?]+$/.test(tok)) {
      result.push(tok);
      continue;
    }

    // Extract surrounding punctuation
    const leadPunct = tok.match(/^([^a-zA-Z]*)/)?.[1] ?? "";
    const trailPunct = tok.match(/([^a-zA-Z]*)$/)?.[1] ?? "";
    const word = tok.slice(leadPunct.length, tok.length - trailPunct.length);

    if (!word) {
      result.push(tok);
      continue;
    }

    const lower = word.toLowerCase();

    // Always keep: if it starts with uppercase and len > 1, assume proper noun
    if (/^[A-Z][a-zA-Z]/.test(word) && !ARTICLES.has(lower)) {
      result.push(tok);
      continue;
    }

    // Lite: remove articles only
    if (level === "lite" && ARTICLES.has(lower)) {
      continue;
    }

    // Full: remove articles, auxiliaries, removable prepositions, filler
    if (level === "full" || level === "ultra") {
      if (ARTICLES.has(lower)) continue;
      if (AUXILIARIES.has(lower)) continue;
      if (FILLER_FULL.has(lower)) continue;
      if (REMOVABLE_PREPS_LITE.has(lower)) continue;
    }

    result.push(tok);
  }

  // Tidy: collapse multiple spaces, fix orphaned punctuation
  let out = result.join("")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,;:!?])/g, "$1")            // fix orphaned commas/semicolons
    .replace(/\s+\.\s+(?!\d)/g, ". ")           // fix orphaned periods (not mid-decimal)
    .replace(/\s+\.\s*$/gm, ".")                // end-of-line period tidy
    .replace(/^\s+|\s+$/gm, "")
    .trim();

  return out;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface CavemanResult {
  output: string;
  level: CavemanLevel;
  stats: {
    origLen: number;
    outLen: number;
    chrReduction: number;
    lossType: "Lossy semantic" | "Grammatically lossy, semantically safe";
  };
}

export function cavemanCompress(text: string, level: CavemanLevel = "full"): CavemanResult {
  const out = compressCaveman(text, level);
  const origLen = text.length;
  const outLen = out.length;
  const chrReduction = origLen ? Math.round(((origLen - outLen) / origLen) * 100) : 0;
  return {
    output: out,
    level,
    stats: {
      origLen,
      outLen,
      chrReduction,
      lossType: level === "lite"
        ? "Grammatically lossy, semantically safe"
        : "Lossy semantic",
    },
  };
}

export function cavemanDecoderPrompt(level: CavemanLevel = "full"): string {
  return `# CaveMan Decompression (${level} level)
You receive text compressed using CaveMan technique (stop-word removal, semantic core preservation).
Restore it to natural, fluent English while preserving ALL factual content.

What was removed:
- Articles (a, an, the)
${level !== "lite" ? "- Auxiliary verbs (is, are, was, were, have, had, do, does...)\n- Common prepositions when clear from context\n- Hedging and filler phrases" : ""}
${level === "ultra" ? "- Short synonyms used (cfg=configuration, db=database, →=leads to, !=not, etc.)\n- Causality arrows (→) replace causal phrases" : ""}

Guidelines:
1. Infer and restore all removed grammar
2. Expand abbreviations to full words
3. Do NOT add new facts, only restore original grammar
4. Maintain paragraph structure and flow
5. Output only the restored text

COMPRESSED TEXT TO RESTORE:`;
}
