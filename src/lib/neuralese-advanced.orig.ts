// Neuralese Advanced — J-space / n-gram-dict / self-information layers.
// Additive module. Composes on top of the base `convert()` engine.
//
// Sources (verified 2025-2026):
//   • Anthropic (Jul 2026): "Verbalizable representations form a global
//     workspace in language models" — J-space / J-lens.  A small set of
//     salient concept vectors drives silent reasoning.  Motivates the
//     workspace_header + concept_extraction.
//   • Zhang et al. 2025 "CompactPrompt": n-gram abbreviation +
//     numeric quantization -> lossless prompt compression (1.44x on top
//     of hard pruning).
//   • Li et al. 2023 "Selective Context": self-information (−log p)
//     ranking to drop low-information lexical units without hurting task
//     performance.
//   • Jiang et al. 2023/24 "LLMLingua / LongLLMLingua": budget-controlled
//     iterative token pruning.  We use its "sentence-priority + rarity"
//     idea in a lightweight deterministic form (no small LM required).

import { convert, type NeuraleseOptions, type NeuraleseResult } from "./neuralese";

// -----------------------------------------------------------------------------
// 1.  Zipf-lite common-word table (proxy for corpus self-information).
//     Ranked list of the ~200 most frequent English words.  Any word not in
//     this table is treated as "content" and receives higher information mass.
// -----------------------------------------------------------------------------
const COMMON_WORDS: string[] = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for",
  "not", "on", "with", "he", "as", "you", "do", "at", "this", "but", "his",
  "by", "from", "they", "we", "say", "her", "she", "or", "an", "will", "my",
  "one", "all", "would", "there", "their", "what", "so", "up", "out", "if",
  "about", "who", "get", "which", "go", "me", "when", "make", "can", "like",
  "time", "no", "just", "him", "know", "take", "people", "into", "year",
  "your", "good", "some", "could", "them", "see", "other", "than", "then",
  "now", "look", "only", "come", "its", "over", "think", "also", "back",
  "after", "use", "two", "how", "our", "work", "first", "well", "way",
  "even", "new", "want", "because", "any", "these", "give", "day", "most",
  "us", "is", "was", "are", "were", "been", "being", "am", "has", "had",
  "having", "does", "did", "doing", "done", "should", "would", "could",
  "may", "might", "must", "shall", "very", "much", "many", "such", "same",
  "another", "each", "every", "few", "more", "less", "own", "same", "here",
  "there", "where", "why", "when", "how", "all", "some", "no", "not",
  "than", "then", "though", "although", "however", "therefore", "thus",
  "hence", "moreover", "furthermore", "nevertheless", "meanwhile",
];
const COMMON_SET = new Set(COMMON_WORDS.map((w) => w.toLowerCase()));

// Zipf-ish rank score.  Lower rank → more common → less information.
function zipfInformation(word: string): number {
  const w = word.toLowerCase();
  const idx = COMMON_WORDS.indexOf(w);
  if (idx === -1) {
    // Not in list — treat as high-information.  Boost longer / capitalized.
    const capBonus = /^[A-Z]/.test(word) ? 1.5 : 0;
    return 4 + Math.min(6, Math.log2(Math.max(2, word.length))) + capBonus;
  }
  // ~ −log2(1 / (idx+2))  = log2(idx+2)  → scaled.
  return Math.log2(idx + 2);
}

// -----------------------------------------------------------------------------
// 2.  N-gram dictionary compression (from CompactPrompt / Zhang 2025).
//     Detects repeated 2..4 grams, assigns Greek-letter codes, and emits
//     a machine-readable legend the LLM can decode.
// -----------------------------------------------------------------------------
const CODEBOOK = [
  "α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ",
  "ν", "ξ", "π", "ρ", "σ", "τ", "φ", "χ", "ψ", "ω",
];

export interface NgramDict {
  entries: { code: string; phrase: string; hits: number }[];
}

interface CandidateHit {
  ngram: string;
  count: number;
  n: number;
}

function tokenizeSoft(text: string): string[] {
  // Word-ish tokens preserving punctuation attached — we only mine ngrams
  // from purely-alphabetic runs (2+ chars) to avoid punctuation noise.
  return text.split(/\s+/).filter(Boolean);
}

function isAlphaTok(t: string): boolean {
  return /^[A-Za-z][A-Za-z-]{1,}$/.test(t);
}

export function buildNgramDict(
  text: string,
  opts: { maxEntries?: number; minHits?: number; nMin?: number; nMax?: number } = {},
): NgramDict {
  const maxEntries = opts.maxEntries ?? CODEBOOK.length;
  const minHits = opts.minHits ?? 2;
  const nMin = opts.nMin ?? 2;
  const nMax = opts.nMax ?? 4;

  const toks = tokenizeSoft(text.toLowerCase());
  const counts = new Map<string, CandidateHit>();

  for (let n = nMin; n <= nMax; n++) {
    for (let i = 0; i + n <= toks.length; i++) {
      const slice = toks.slice(i, i + n);
      // require all-alphabetic (no punctuation/numeric noise)
      if (!slice.every(isAlphaTok)) continue;
      const g = slice.join(" ");
      // skip if too short overall (dict overhead not worth it)
      if (g.length < 6) continue;
      const cur = counts.get(g);
      if (cur) cur.count += 1;
      else counts.set(g, { ngram: g, count: 1, n });
    }
  }

  // Score by savings = (count - 1) * (phrase_len - code_len) - legend_cost
  const scored = [...counts.values()]
    .filter((c) => c.count >= minHits)
    .map((c) => ({
      ...c,
      savings: (c.count - 1) * (c.ngram.length - 1) - (c.ngram.length + 4),
    }))
    .filter((c) => c.savings > 0)
    // prefer longer + more frequent
    .sort((a, b) => b.savings - a.savings);

  // Greedy dedup: prevent overlapping ngrams (e.g. "the quick brown" vs
  // "quick brown fox" both firing).  We keep the higher-scored one, then
  // drop any candidate whose ngram is a substring of an accepted one.
  const chosen: CandidateHit[] = [];
  for (const cand of scored) {
    if (chosen.length >= maxEntries) break;
    const conflict = chosen.some(
      (c) => c.ngram.includes(cand.ngram) || cand.ngram.includes(c.ngram),
    );
    if (!conflict) chosen.push(cand);
  }

  return {
    entries: chosen.map((c, i) => ({
      code: CODEBOOK[i],
      phrase: c.ngram,
      hits: c.count,
    })),
  };
}

// Apply the dictionary to a body of text.  Case-insensitive on the phrase
// but we preserve the code exactly.  Runs before other pipelines.
export function applyNgramDict(text: string, dict: NgramDict): string {
  let out = text;
  for (const { code, phrase } of dict.entries) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "gi");
    out = out.replace(re, code);
  }
  return out;
}

// Serialize the dictionary as a compact legend line suitable for prepending.
export function renderDictLegend(dict: NgramDict): string {
  if (dict.entries.length === 0) return "";
  const parts = dict.entries.map((e) => `${e.code}=${e.phrase}`);
  return `§dict{${parts.join(";")}}`;
}

// -----------------------------------------------------------------------------
// 3.  J-space workspace: extract top-K salient concept tokens.
//     Mirrors Anthropic's J-lens finding that a small ranked list of
//     high-salience vocabulary items drives silent reasoning.  We surface
//     these as a "concept anchor" the downstream LLM can attend to first.
// -----------------------------------------------------------------------------
export interface WorkspaceItem {
  token: string;
  score: number;
  hits: number;
}

export function extractWorkspace(text: string, k = 8): WorkspaceItem[] {
  const toks = tokenizeSoft(text);
  const bag = new Map<string, { hits: number; raw: string }>();

  for (const raw of toks) {
    const bare = raw.replace(/[^A-Za-z-]/g, "");
    if (!bare || bare.length < 3) continue;
    const key = bare.toLowerCase();
    if (COMMON_SET.has(key)) continue;
    const cur = bag.get(key);
    if (cur) cur.hits += 1;
    else bag.set(key, { hits: 1, raw: bare });
  }

  const scored = [...bag.entries()].map(([key, v]) => {
    const info = zipfInformation(key);
    // salience  = info × (1 + log(hits))  — mimics tf·idf lite
    const salience = info * (1 + Math.log2(1 + v.hits));
    return { token: v.raw, score: Number(salience.toFixed(2)), hits: v.hits };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

export function renderWorkspaceHeader(items: WorkspaceItem[]): string {
  if (items.length === 0) return "";
  return `⟨ws:${items.map((i) => i.token).join(",")}⟩`;
}

// -----------------------------------------------------------------------------
// 4.  Self-information pruning (Selective-Context lite).
//     Drops the N lowest-information content words per line when the caller
//     wants an aggressive budget cut *after* the base pipeline has run.
// -----------------------------------------------------------------------------
export function infoPruneLine(line: string, keepPct: number): string {
  // keepPct is fraction of content words to keep, in [0,1]
  const parts = line.split(/(\s+)/);
  const contentIdx: { idx: number; score: number }[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (/^\s+$/.test(p)) continue;
    const bare = p.replace(/[^A-Za-z-]/g, "");
    if (!bare || bare.length < 3) continue;
    contentIdx.push({ idx: i, score: zipfInformation(bare) });
  }
  if (contentIdx.length === 0) return line;

  const keepN = Math.max(1, Math.round(contentIdx.length * keepPct));
  // keep the highest-information ones
  const sorted = [...contentIdx].sort((a, b) => b.score - a.score);
  const keep = new Set(sorted.slice(0, keepN).map((x) => x.idx));
  return parts
    .map((p, i) => {
      if (/^\s+$/.test(p)) return p;
      const bare = p.replace(/[^A-Za-z-]/g, "");
      if (!bare || bare.length < 3) return p; // punctuation / short → keep
      return keep.has(i) ? p : "";
    })
    .join("")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// -----------------------------------------------------------------------------
// 5.  Shannon entropy per character (bits/char).  Real information density.
// -----------------------------------------------------------------------------
export function shannonBitsPerChar(text: string): number {
  if (!text.length) return 0;
  const counts = new Map<string, number>();
  for (const ch of text) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  const n = text.length;
  let H = 0;
  for (const c of counts.values()) {
    const p = c / n;
    H -= p * Math.log2(p);
  }
  return Number(H.toFixed(3));
}

// -----------------------------------------------------------------------------
// 6.  Decoder preamble.  Copy-paste system prompt teaching any LLM how to
//     read the emitted neuralese: symbol table + active n-gram dictionary.
// -----------------------------------------------------------------------------
const SYMBOL_LEGEND: [string, string][] = [
  ["∴", "therefore"],
  ["∵", "because"],
  ["→", "leads to / implies"],
  ["⇔", "if and only if"],
  ["∧", "and"],
  ["∨", "or"],
  ["¬", "not"],
  ["∀", "for all / every"],
  ["∃", "there exists"],
  ["≈", "approximately"],
  ["≥", "greater than or equal"],
  ["≤", "less than or equal"],
  [">", "greater than"],
  ["<", "less than"],
  ["=", "equals"],
  ["↑", "increase"],
  ["↓", "decrease"],
  ["⟂", "on the other hand / contrast"],
  ["&", "and"],
  ["+", "plus / in addition"],
  ["/", "per"],
  ["vs", "versus / compared to"],
  ["re:", "regarding"],
  ["w/", "with"],
  ["w/o", "without"],
  ["w/in", "within"],
  ["btw", "between"],
  ["e.g.", "for example"],
  ["i.e.", "that is"],
];

export function buildDecoderPreamble(dict: NgramDict, workspace: WorkspaceItem[]): string {
  const lines: string[] = [];
  lines.push("# NEURALESE DECODER PREAMBLE");
  lines.push("You will receive a compressed message in 'neuralese'. Decode it using these rules before answering.");
  lines.push("");
  lines.push("## Symbol table");
  for (const [sym, mean] of SYMBOL_LEGEND) lines.push(`  ${sym}  = ${mean}`);
  lines.push("");
  lines.push("## Abbreviations");
  lines.push("  app=application  cfg/config=configuration  db=database  fn=function  perf=performance  arch=architecture  spec=specification  req=requirement  info=information  dev=development  env=environment  impl=implementation  mgmt=management  approx=approximately  k=thousand  M=million  B=billion");
  if (dict.entries.length) {
    lines.push("");
    lines.push("## Session n-gram dictionary");
    for (const e of dict.entries) lines.push(`  ${e.code} = "${e.phrase}"  (used ${e.hits}x)`);
  }
  if (workspace.length) {
    lines.push("");
    lines.push("## Workspace (salient concepts to prioritize)");
    lines.push("  " + workspace.map((w) => w.token).join(", "));
  }
  lines.push("");
  lines.push("## Structural conventions");
  lines.push("  ';' separates sentence-equivalents in telegraphic mode.");
  lines.push("  '⟨ws:...⟩' at the top is the concept anchor. '§dict{...}' defines local phrase codes.");
  lines.push("  Interpret dropped vowels by nearest English word (e.g. 'perfrmnce' → 'performance').");
  lines.push("");
  lines.push("Now read the message and answer normally.");
  return lines.join("\n");
}

// -----------------------------------------------------------------------------
// 7.  Round-trip preview.  Partial decompression: reverses n-gram dict and
//     the safe symbol substitutions so users can sanity-check preservation.
// -----------------------------------------------------------------------------
export function partialDecompress(text: string, dict: NgramDict): string {
  let out = text;
  // strip ⟨ws:...⟩ and §dict{...} headers
  out = out.replace(/^⟨ws:[^⟩]*⟩\s*/g, "");
  out = out.replace(/§dict\{[^}]*\}\s*/g, "");
  // undo n-gram codes first (they are single glyphs)
  for (const { code, phrase } of dict.entries) {
    const re = new RegExp(code, "g");
    out = out.replace(re, phrase);
  }
  // undo the safe symbol subs
  const reverseSyms: [string, string][] = [
    ["∴", " therefore "],
    ["∵", " because "],
    [" → ", " leads to "],
    ["⇔", " if and only if "],
    ["≥", " >= "],
    ["≤", " <= "],
    ["≈", " approximately "],
    ["∀", " every "],
    ["∃", " there exists "],
    ["w/o", "without"],
    ["w/in", "within"],
    ["w/", "with "],
    ["btw", "between"],
    ["re:", "regarding"],
  ];
  for (const [sym, w] of reverseSyms) {
    out = out.split(sym).join(w);
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

// -----------------------------------------------------------------------------
// 8.  Advanced convert: orchestrates dict → base convert → workspace →
//     optional info-prune.  Returns everything the UI needs.
// -----------------------------------------------------------------------------
export interface AdvancedOptions {
  ngramDict: boolean;
  workspaceHeader: boolean;
  infoPrune: boolean;
  infoPruneKeep: number; // fraction to keep, e.g. 0.7
  workspaceK: number;
}

export const DEFAULT_ADVANCED: AdvancedOptions = {
  ngramDict: true,
  workspaceHeader: true,
  infoPrune: false,
  infoPruneKeep: 0.75,
  workspaceK: 8,
};

export interface AdvancedResult extends NeuraleseResult {
  dict: NgramDict;
  workspace: WorkspaceItem[];
  entropyBitsPerChar: number;
  decoderPreamble: string;
  roundTrip: string;
}

export function convertAdvanced(
  input: string,
  base: NeuraleseOptions,
  adv: AdvancedOptions = DEFAULT_ADVANCED,
): AdvancedResult {
  // 1. workspace extraction from ORIGINAL text (concepts pre-compression)
  const workspace = extractWorkspace(input, adv.workspaceK);

  // 2. build ngram dict from ORIGINAL text
  const dict = adv.ngramDict ? buildNgramDict(input) : { entries: [] };

  // 3. apply dict before base pipeline (so dict codes survive symbol subs)
  const preText = adv.ngramDict ? applyNgramDict(input, dict) : input;

  // 4. run the existing base engine unchanged
  const baseRes = convert(preText, base);

  // 5. optional info-prune per line (post-base)
  let body = baseRes.output;
  if (adv.infoPrune) {
    body = body
      .split("\n")
      .map((line) => infoPruneLine(line, adv.infoPruneKeep))
      .join("\n");
  }

  // 6. assemble header(s)
  const headers: string[] = [];
  if (adv.workspaceHeader && workspace.length) headers.push(renderWorkspaceHeader(workspace));
  if (adv.ngramDict && dict.entries.length) headers.push(renderDictLegend(dict));
  const composed = [...headers, body].filter(Boolean).join("\n");

  const outChars = composed.length;
  const inChars = input.length;
  const inTokensEst = Math.max(1, Math.round(inChars / 4));
  const outTokensEst = Math.max(1, Math.round(outChars / 4));

  return {
    output: composed,
    stats: {
      inChars,
      outChars,
      charDeltaPct: inChars ? Math.round(((inChars - outChars) / inChars) * 100) : 0,
      inWords: baseRes.stats.inWords,
      outWords: (composed.trim().match(/\S+/g) ?? []).length,
      inTokensEst,
      outTokensEst,
      tokenDeltaPct: inTokensEst
        ? Math.round(((inTokensEst - outTokensEst) / inTokensEst) * 100)
        : 0,
    },
    dict,
    workspace,
    entropyBitsPerChar: shannonBitsPerChar(composed),
    decoderPreamble: buildDecoderPreamble(dict, workspace),
    roundTrip: partialDecompress(composed, dict),
  };
}
