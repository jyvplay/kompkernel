// Neuralese Selective Semantic Fetch Loop Harness (2026)
//
// Grounded in verified research & RAG workflows:
// - "RAG Isn't Enough — I Built the Missing Context Layer" (Apr 2026): TokenBudget
//   allocation, query-aware extractive ranking, and source-order context restoration.
// - "Cache-Craft: Managing Chunk-Caches for Efficient RAG" (Feb 2025): Precise
//   chunk identification via hashing.
//
// When managing massive project context or codebases, this harness turns the full
// corpus into an interactive Table of Contents map (`[[D12L]]` Skeleton).
// Downstream LLMs or users can query the map and selectively execute `fetchChunk()`
// to load only the exact context required, minimizing latency and API costs.

import { estimateTokensBPE } from "./neuralese-metrics";

export interface SemanticChunk {
  handle: string;
  sourcePath: string;
  title: string;
  content: string;
  charCount: number;
  bpeTokens: number;
  summaryPreview: string;
}

export interface InteractiveFetchHarness {
  corpusId: string;
  chunks: SemanticChunk[];
  skeletonMap: string;
  totalTokens: number;
}

function createHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + (text.codePointAt(i) ?? 0);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(6, "0");
}

function extractTitle(content: string, fallbacksIdx: number): string {
  const m = content.match(/^(?:#+|\/\/|\/\*|<!--|<h\d>|[A-Z][A-Za-z0-9_.]+:?)\s*(.*)$/m);
  if (m && m[1] && m[1].trim().length >= 4) {
    return m[1].trim().slice(0, 48);
  }
  const s = content.split(/[.!?\n]/)[0] ?? "";
  if (s.trim().length >= 4) return s.trim().slice(0, 48);
  return `Section ${fallbacksIdx + 1}`;
}

export function buildFetchHarness(corpusText: string, defaultPath = "document.md"): InteractiveFetchHarness {
  const corpusId = `C_${createHash(corpusText)}`;

  // Split by markdown headings or double blank lines
  const rawSegments = corpusText
    .split(/(?=^[ \t]*#+ |\n{3,})/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);

  const segments = rawSegments.length > 0 ? rawSegments : [corpusText];

  const chunks: SemanticChunk[] = segments.map((seg, idx) => {
    const handle = `H${String(idx + 1).padStart(4, "0")}`;
    const charCount = seg.length;
    const bpeTokens = estimateTokensBPE(seg);
    const title = extractTitle(seg, idx);
    const summaryPreview = seg.slice(0, 72).replace(/\s+/g, " ");

    return {
      handle,
      sourcePath: defaultPath,
      title,
      content: seg,
      charCount,
      bpeTokens,
      summaryPreview,
    };
  });

  const totalTokens = chunks.reduce((acc, c) => acc + c.bpeTokens, 0);

  const mapLines = [
    `[[D12L_FETCH_MAP|corpus=${corpusId}|chunks=${chunks.length}|total_tok~=${totalTokens}]]`,
    ...chunks.map(
      (c) => `${c.handle} (${c.bpeTokens} tok) :: [${c.title}] "${c.summaryPreview}..."`
    ),
    `# TO LOAD CONTEXT: Execute fetchChunk(handle) or pull specific H000n handles.`,
  ];

  return {
    corpusId,
    chunks,
    skeletonMap: mapLines.join("\n"),
    totalTokens,
  };
}

export function fetchChunkByHandle(harness: InteractiveFetchHarness, handle: string): SemanticChunk | null {
  const found = harness.chunks.find(
    (c) => c.handle.toLowerCase() === handle.trim().toLowerCase()
  );
  return found ?? null;
}

export function fetchQueryExtractive(harness: InteractiveFetchHarness, query: string, maxTokens = 600): SemanticChunk[] {
  // Extractive query-aware ranking (RAG Missing Context Layer 2026 pattern):
  // Score every chunk by TF-IDF / term overlap with the query, rank, and greedily
  // select chunks within token budget, returning them in their ORIGINAL source order.
  const queryTerms = query
    .toLowerCase()
    .match(/[a-z0-9_]{3,}/g) ?? [];

  if (queryTerms.length === 0) return harness.chunks.slice(0, 2);

  const scored = harness.chunks.map((chunk) => {
    const lower = chunk.content.toLowerCase();
    let hits = 0;
    for (const t of queryTerms) {
      if (lower.includes(t)) hits += 1;
    }
    return { chunk, hits };
  });

  const ranked = [...scored]
    .filter((c) => c.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  if (ranked.length === 0) return [harness.chunks[0] ?? harness.chunks[0]!].filter(Boolean);

  const selected: SemanticChunk[] = [];
  let budget = maxTokens;

  for (const item of ranked) {
    if (item.chunk.bpeTokens <= budget || selected.length === 0) {
      selected.push(item.chunk);
      budget -= item.chunk.bpeTokens;
    }
  }

  // Restore ORIGINAL source order to prevent incoherent context fragmentation
  selected.sort(
    (a, b) =>
      harness.chunks.indexOf(a) - harness.chunks.indexOf(b)
  );

  return selected;
}
