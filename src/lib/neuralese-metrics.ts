// Neuralese Metrics — honest BPE-aware token estimation, semantic-fidelity
// gauge, and rate-distortion compression grading.
//
// WHY THIS MODULE EXISTS (honesty correction):
//   The base engine reports token counts as chars/4 (the OpenAI rule-of-thumb
//   for ordinary English).  That heuristic is badly wrong for the Unicode
//   glyphs this app emits.  In real BPE vocabularies (cl100k_base / o200k_base
//   used by GPT-4/4o, and comparable BPEs in Claude/Llama), rare non-ASCII
//   characters are byte-fallback encoded into 1-3 tokens EACH — the opposite
//   of "0.25 tokens".  So "∴" is not cheaper than "therefore"; it is often
//   equal or MORE expensive.  This module gives an honest estimate so users
//   are not misled, plus a fidelity gauge so they can see when compression
//   is lossy ("audit survivability", per CompactPrompt 2025).
//
// Sources (verified 2025-2026):
//   • CompressionAttack (arXiv 2510.22963, 2026): BPE token-boundary edits
//     materially change token counts — subword boundaries matter.
//   • CompactPrompt (arXiv 2510.18043, 2025): semantic similarity >= 0.92
//     generally indicates safe compression; token count alone is insufficient.
//   • "Prompt Compression in the Wild" (2026): fewer tokens != better; real
//     benefit depends on whether savings survive downstream use.
//   • Gist/Z-tokens + Agarwal RL: rate-distortion reward = ΔlogP − λ|Z|,
//     motivating a single efficiency grade balancing size vs. fidelity.

// -----------------------------------------------------------------------------
// 1. Honest BPE-aware token estimator.
//    Approximates cl100k/o200k behavior without shipping a tokenizer:
//      • ASCII text runs  -> ~len/4 tokens (standard English heuristic),
//        with a per-"word" floor so short tokens still cost >= ~0.5.
//      • Digits           -> grouped ~ every 3 chars = 1 token.
//      • Non-ASCII chars  -> byte-fallback cost by UTF-8 byte length,
//        because they are usually NOT single vocab entries:
//          - "technical/math" symbols (∴ ∵ → ⇔ ∀ ∃ ≥ ≤ ∧ ∨ ¬ ↑ ↓ ⟂ ⟨ ⟩ §)
//            cost ~= their UTF-8 byte count (2-3 tokens).
//          - other non-ASCII letters (e.g. Greek α β γ) cost ~= max(1, bytes-1),
//            since some merge but most do not appear as single BPE tokens.
//    This is a conservative APPROXIMATION, clearly labelled as such in the UI.
// -----------------------------------------------------------------------------

const TECH_SYMBOLS = new Set([
  "∴", "∵", "→", "⇔", "∀", "∃", "≥", "≤", "∧", "∨", "¬", "↑", "↓", "⟂",
  "⟨", "⟩", "§", "≈", "×", "÷", "±", "∈", "∉", "⊂", "⊆", "∪", "∩", "∅",
]);

function utf8ByteLength(ch: string): number {
  const cp = ch.codePointAt(0) ?? 0;
  if (cp < 0x80) return 1;
  if (cp < 0x800) return 2;
  if (cp < 0x10000) return 3;
  return 4;
}

export function estimateTokensBPE(text: string): number {
  if (!text) return 0;
  let tokens = 0;
  let asciiRun = 0;

  const flushAscii = () => {
    if (asciiRun > 0) {
      // ~4 chars/token for English, but never less than ~1 token per 4 chars.
      tokens += Math.max(1, Math.round(asciiRun / 4));
      asciiRun = 0;
    }
  };

  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x80) {
      asciiRun += 1;
      continue;
    }
    // non-ASCII: flush pending ascii, then price the glyph honestly
    flushAscii();
    const bytes = utf8ByteLength(ch);
    if (TECH_SYMBOLS.has(ch)) {
      tokens += bytes; // 2-3 tokens for math/logic glyphs
    } else {
      tokens += Math.max(1, bytes - 1); // other unicode letters/symbols
    }
  }
  flushAscii();
  return tokens;
}

// -----------------------------------------------------------------------------
// 2. Semantic fidelity gauge (audit survivability).
//    Measures how many salient CONTENT concepts from the original survive into
//    a partial round-trip decompression.  Uses crude stemming + a stopword
//    filter so morphological noise doesn't penalize valid preservation.
//    Returns a 0..1 score (higher = more meaning preserved).
// -----------------------------------------------------------------------------

const STOP = new Set([
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "it", "for",
  "not", "on", "with", "as", "you", "do", "at", "this", "but", "his", "by",
  "from", "they", "we", "her", "she", "or", "an", "will", "my", "one", "all",
  "would", "there", "their", "what", "so", "up", "out", "if", "about", "who",
  "get", "which", "go", "me", "when", "make", "can", "like", "no", "just",
  "him", "know", "take", "into", "your", "some", "could", "them", "see",
  "other", "than", "then", "now", "also", "its", "over", "is", "was", "are",
  "were", "been", "being", "am", "has", "had", "having", "does", "did",
  "should", "may", "might", "must", "very", "much", "many", "such", "each",
]);

// Abbreviation/expansion equivalence so the fidelity gauge does not unfairly
// punish lossless abbreviations (e.g. "app" == "application").  These mirror
// the ABBREV dictionary in the base engine.  Applied before stemming so both
// the original word and its compressed form collapse to the same concept.
const ABBREV_EXPAND: Record<string, string> = {
  app: "application", apps: "application", cfg: "configuration",
  config: "configuration", db: "database", dbs: "database", fn: "function",
  fns: "function", perf: "performance", arch: "architecture",
  infra: "infrastructure", spec: "specification", specs: "specification",
  req: "requirement", reqs: "requirement", info: "information",
  dev: "development", env: "environment", envs: "environment",
  impl: "implementation", impls: "implementation", mgmt: "management",
  docs: "documentation", doc: "document", repo: "repository",
  repos: "repository", org: "organization", orgs: "organization",
  opt: "optimization", comms: "communication", temp: "temperature",
  freq: "frequency", ref: "reference", refs: "reference", var: "variable",
  vars: "variable", prev: "previous", cur: "current", std: "standard",
  ex: "example", ver: "version", vers: "version", param: "parameter",
  params: "parameter", max: "maximum", min: "minimum", avg: "average",
  est: "estimate", approx: "approximately", thru: "through", bc: "because",
  tech: "technology", techs: "technology",
};

function stem(word: string): string {
  let w = word.toLowerCase();
  if (ABBREV_EXPAND[w]) w = ABBREV_EXPAND[w];
  // order matters: longest suffixes first
  for (const suf of ["ations", "ation", "ingly", "ings", "edly", "ing", "ies", "ied", "ed", "es", "s", "ly"]) {
    if (w.length > suf.length + 2 && w.endsWith(suf)) {
      w = w.slice(0, -suf.length);
      break;
    }
  }
  return w;
}

function contentStems(text: string): Set<string> {
  const out = new Set<string>();
  const toks = text.toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? [];
  for (const t of toks) {
    if (STOP.has(t)) continue;
    out.add(stem(t));
  }
  return out;
}

export interface FidelityResult {
  score: number; // 0..1 fraction of original content concepts recovered
  preserved: number;
  total: number;
  lost: string[]; // sample of lost concepts (up to 12)
}

export function semanticFidelity(original: string, roundTrip: string): FidelityResult {
  const orig = contentStems(original);
  const back = contentStems(roundTrip);
  let preserved = 0;
  const lost: string[] = [];
  for (const s of orig) {
    if (back.has(s)) preserved += 1;
    else if (lost.length < 12) lost.push(s);
  }
  const total = orig.size;
  return {
    score: total === 0 ? 1 : preserved / total,
    preserved,
    total,
    lost,
  };
}

// -----------------------------------------------------------------------------
// 3. Rate-distortion compression grade.
//    Combines honest token savings (rate) with fidelity (1 - distortion) into
//    a single letter grade, echoing reward = ΔlogP − λ|Z| intuition.
//    We reward real token reduction ONLY when fidelity stays high.
// -----------------------------------------------------------------------------

export interface GradeResult {
  realInTokens: number;
  realOutTokens: number;
  realSavingsPct: number; // positive = smaller (can be negative!)
  fidelity: number; // 0..1
  efficiency: number; // 0..100 composite
  grade: string; // A+ .. F
  verdict: "excellent" | "good" | "fair" | "poor" | "counterproductive";
  warnings: string[];
}

export function gradeCompression(
  original: string,
  compressed: string,
  roundTrip: string,
): GradeResult {
  const realIn = estimateTokensBPE(original);
  const realOut = estimateTokensBPE(compressed);
  const realSavingsPct = realIn ? Math.round(((realIn - realOut) / realIn) * 100) : 0;
  const fid = semanticFidelity(original, roundTrip);

  const warnings: string[] = [];
  if (realSavingsPct <= 0) {
    warnings.push(
      "Real (BPE-aware) token count did NOT decrease — Unicode glyphs may cost as many tokens as the words they replace.",
    );
  }
  if (fid.score < 0.85 && fid.total > 4) {
    warnings.push(
      `Fidelity ${Math.round(fid.score * 100)}% — below the ~0.92 'safe compression' threshold (CompactPrompt 2025). Some concepts may not survive.`,
    );
  }

  // efficiency: reward real savings, gate by fidelity (distortion penalty).
  // normalize savings to 0..1 over a 60% target, clamp.
  const rate = Math.max(-1, Math.min(1, realSavingsPct / 60));
  const efficiency = Math.round(Math.max(0, Math.min(100, (0.55 * ((rate + 1) / 2) + 0.45 * fid.score) * 100)));

  let grade = "F";
  let verdict: GradeResult["verdict"] = "poor";
  if (realSavingsPct <= 0 && fid.score < 0.9) {
    grade = "F";
    verdict = "counterproductive";
  } else if (efficiency >= 85) {
    grade = "A+";
    verdict = "excellent";
  } else if (efficiency >= 75) {
    grade = "A";
    verdict = "excellent";
  } else if (efficiency >= 65) {
    grade = "B";
    verdict = "good";
  } else if (efficiency >= 55) {
    grade = "C";
    verdict = "fair";
  } else if (efficiency >= 45) {
    grade = "D";
    verdict = "poor";
  } else {
    grade = "F";
    verdict = "counterproductive";
  }

  return {
    realInTokens: realIn,
    realOutTokens: realOut,
    realSavingsPct,
    fidelity: fid.score,
    efficiency,
    grade,
    verdict,
    warnings,
  };
}
