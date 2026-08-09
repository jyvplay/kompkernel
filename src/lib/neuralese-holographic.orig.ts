// Neuralese Holographic Mode — Bulk/Boundary Compression via Holographic Principle
//
// Physics isomorphism:
//   Holographic principle: bulk information can be represented on a lower-dimensional boundary.
//   Text: repeated concept anchors form a compact boundary dictionary; the prose bulk is rewritten
//   as references into that boundary.
//
// Math / CS grounding:
// - Bekenstein-Hawking area-law metaphor: represent information on boundary anchors.
// - AdS/CFT metaphor: boundary dictionary + bulk references reconstruct original prose.
// - MDL / Rissanen two-part code: accept only if L(boundary)+L(bulk|boundary) < L(original).
// - Zipf: repeated high-salience terms are where boundary references pay off.
//
// Engineering guarantees:
// - Exact reversible decode for the emitted payload.
// - Collision-safe visible ASCII codes ($a, $b, ...), never chosen if already in source.
// - Case-preserving: exact surface forms are encoded separately ("Database" != "database").
// - Honest fallback: if MDL rejects, output is original unchanged.

import { estimateTokensBPE } from "./neuralese-metrics";

export interface HolographicAnchor {
  code: string;
  term: string;
  frequency: number;
  informationBits: number;
}

export interface HolographicResult {
  output: string;
  decoded: string;
  exact: boolean;
  isCompressed: boolean;
  anchors: HolographicAnchor[];
  stats: {
    origLen: number;
    outLen: number;
    charSavings: number;
    charSavingsPct: number;
    realInTokens: number;
    realOutTokens: number;
    realSavingsPct: number;
    mdlAccepted: boolean;
    bekensteinBoundBits: number;
    actualInformationBits: number;
    holographicEfficiency: number;
    boundaryDim: number;
    bulkDim: number;
  };
  decoderPrompt: string;
}

const HOLO_STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
  "may", "might", "must", "shall", "can", "of", "to", "in", "for", "on", "at",
  "by", "from", "with", "as", "it", "its", "this", "that", "these", "those",
  "they", "them", "their", "we", "our", "us", "you", "your", "he", "she", "his",
  "her", "and", "or", "but", "not", "if", "so", "then", "than", "there", "here",
  "when", "where", "why", "how", "which", "what", "who", "whom", "whose", "very",
  "just", "even", "only", "also", "too", "still", "yet", "much", "many", "some",
  "any", "all", "each", "every", "one", "two", "no",
]);

const HOLO_CODEBOOK: string[] = [];
for (const c of "abcdefghijklmnopqrstuvwxyz") HOLO_CODEBOOK.push(`$${c}`);
for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") HOLO_CODEBOOK.push(`$${c}`);
for (const c of "0123456789") HOLO_CODEBOOK.push(`$${c}`);
for (const c of ["_", "~", "#", "%", "^"]) HOLO_CODEBOOK.push(`$${c}`);

function cleanWord(w: string): string {
  return w.replace(/^[^A-Za-z0-9-]+|[^A-Za-z0-9-]+$/g, "");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shannonEntropyOfFreq(frequencies: number[]): number {
  const total = frequencies.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let h = 0;
  for (const f of frequencies) {
    const p = f / total;
    h -= p * Math.log2(p);
  }
  return h;
}

function bekensteinBoundText(n: number, meanInfoBits: number): number {
  if (n <= 1) return 0;
  return n * Math.log2(n) * Math.max(1, meanInfoBits);
}

function chooseCode(source: string, used: Set<string>): string | null {
  for (const code of HOLO_CODEBOOK) {
    if (!used.has(code) && !source.includes(code)) return code;
  }
  return null;
}

export function compressHolographic(text: string, maxAnchors = 48): HolographicResult {
  const origLen = text.length;
  const realInTokens = estimateTokensBPE(text);

  const emptyResult = (reasonOutput = text): HolographicResult => ({
    output: reasonOutput,
    decoded: reasonOutput,
    exact: reasonOutput === text,
    isCompressed: false,
    anchors: [],
    stats: {
      origLen,
      outLen: reasonOutput.length,
      charSavings: origLen - reasonOutput.length,
      charSavingsPct: origLen ? Math.round(((origLen - reasonOutput.length) / origLen) * 100) : 0,
      realInTokens,
      realOutTokens: estimateTokensBPE(reasonOutput),
      realSavingsPct: realInTokens
        ? Math.round(((realInTokens - estimateTokensBPE(reasonOutput)) / realInTokens) * 100)
        : 0,
      mdlAccepted: false,
      bekensteinBoundBits: 0,
      actualInformationBits: 0,
      holographicEfficiency: 0,
      boundaryDim: 0,
      bulkDim: 0,
    },
    decoderPrompt: buildHolographicDecoder([]),
  });

  if (!text.trim()) return emptyResult();

  const freqMap = new Map<string, number>();
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    const surface = cleanWord(raw);
    const normalized = surface.toLowerCase();
    if (!surface || surface.length < 4 || HOLO_STOPWORDS.has(normalized)) continue;
    freqMap.set(surface, (freqMap.get(surface) ?? 0) + 1);
  }

  const ranked = [...freqMap.entries()]
    .map(([term, frequency]) => ({
      term,
      frequency,
      score: frequency * (term.length - 2),
    }))
    .filter((x) => x.frequency >= 2 && x.score > 0)
    .sort((a, b) => b.score - a.score || b.term.length - a.term.length);

  const usedCodes = new Set<string>();
  const anchors: HolographicAnchor[] = [];
  for (const cand of ranked) {
    if (anchors.length >= maxAnchors) break;
    const code = chooseCode(text, usedCodes);
    if (!code) break;
    const headerCost = code.length + cand.term.length + 2;
    const bulkSavings = cand.frequency * (cand.term.length - code.length);
    if (bulkSavings <= headerCost) continue;
    usedCodes.add(code);
    anchors.push({
      code,
      term: cand.term,
      frequency: cand.frequency,
      informationBits: Math.log2(Math.max(2, cand.frequency + 1)),
    });
  }

  if (anchors.length === 0) return emptyResult();

  let bulk = text;
  for (const a of [...anchors].sort((x, y) => y.term.length - x.term.length)) {
    const re = new RegExp(`\\b${escapeRegExp(a.term)}\\b`, "g");
    bulk = bulk.replace(re, a.code);
  }

  const boundaryHeader = `[BND:${anchors.map((a) => `${a.code}=${a.term}`).join(",")}]`;
  const candidate = `${boundaryHeader}\n${bulk}`;
  const decoded = decodeHolographic(candidate);
  const exact = decoded === text;
  const realOutTokensCandidate = estimateTokensBPE(candidate);
  const mdlAccepted = exact && candidate.length < text.length && realOutTokensCandidate < realInTokens;
  const finalOutput = mdlAccepted ? candidate : text;
  const finalDecoded = mdlAccepted ? decoded : text;
  const outLen = finalOutput.length;
  const realOutTokens = estimateTokensBPE(finalOutput);

  const actualInformationBits = shannonEntropyOfFreq(anchors.map((a) => a.frequency));
  const meanInfo = anchors.length
    ? anchors.reduce((sum, a) => sum + a.informationBits, 0) / anchors.length
    : 0;
  const bekensteinBoundBits = bekensteinBoundText(anchors.length, meanInfo);

  return {
    output: finalOutput,
    decoded: finalDecoded,
    exact: finalDecoded === text,
    isCompressed: mdlAccepted,
    anchors: mdlAccepted ? anchors : [],
    stats: {
      origLen,
      outLen,
      charSavings: origLen - outLen,
      charSavingsPct: origLen ? Math.round(((origLen - outLen) / origLen) * 100) : 0,
      realInTokens,
      realOutTokens,
      realSavingsPct: realInTokens ? Math.round(((realInTokens - realOutTokens) / realInTokens) * 100) : 0,
      mdlAccepted,
      bekensteinBoundBits: Number(bekensteinBoundBits.toFixed(2)),
      actualInformationBits: Number(actualInformationBits.toFixed(2)),
      holographicEfficiency:
        bekensteinBoundBits > 0
          ? Number(Math.min(1, actualInformationBits / bekensteinBoundBits).toFixed(3))
          : 0,
      boundaryDim: mdlAccepted ? anchors.length : 0,
      bulkDim: freqMap.size,
    },
    decoderPrompt: buildHolographicDecoder(mdlAccepted ? anchors : []),
  };
}

export function decodeHolographic(encoded: string): string {
  const match = encoded.match(/^\[BND:([^\]]*)\]\n?/);
  if (!match) return encoded;
  const header = match[1] ?? "";
  let body = encoded.slice(match[0].length);
  const pairs = header
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const eq = chunk.indexOf("=");
      if (eq < 0) return null;
      return { code: chunk.slice(0, eq), term: chunk.slice(eq + 1) };
    })
    .filter((x): x is { code: string; term: string } => Boolean(x))
    .sort((a, b) => b.code.length - a.code.length);

  for (const p of pairs) {
    body = body.replace(new RegExp(escapeRegExp(p.code), "g"), p.term);
  }
  return body;
}

export function buildHolographicDecoder(anchors: HolographicAnchor[]): string {
  if (anchors.length === 0) {
    return "The message uses Neuralese Holographic mode. No [BND] boundary dictionary is present, so read the text literally.";
  }
  return [
    "# NEURALESE HOLOGRAPHIC DECODER",
    "Input is encoded as boundary dictionary + bulk references.",
    "Parse [BND:$a=term,...]. Replace every $code in the bulk with its exact term.",
    "This is exact when the [BND] header is present; preserve all other text literally.",
    "Boundary anchors:",
    ...anchors.map((a) => `- ${a.code} = ${a.term} (x${a.frequency})`),
  ].join("\n");
}
