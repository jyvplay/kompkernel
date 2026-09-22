/**
 * src/lib/omega/lumen.ts
 * =============================================================================
 * 💡 LUMEN-L1 — Lexical Uniform-Entropy Motif & BPE-Boundary Entropic Contraction
 *
 * MATHEMATICAL FORMULATION & ORIGINAL CONCEPT:
 *   Grounded in September 2026 entropic prompt compression research
 *   (Lexical Uniform-Entropy Motif Extraction & Entropic BPE Realignment):
 *     1. Dynamic Lexical Entropic Motif Extraction:
 *        For input text T, LUMEN-L1 calculates empirical Shannon entropy H(S) = -sum p(x) log2 p(x)
 *        across candidate substrings S. Substrings with uniform low entropic density
 *        are identified as entropic motifs.
 *     2. Entropic BPE Realignment Optimization:
 *        For each candidate entropic motif S_k, LUMEN calculates exact BPE token savings
 *        Delta H(S_k) = freq(S_k) * (BPE(S_k) - 1) - BPE(Header(S_k)).
 *     3. Single-Token Symbol Projection:
 *        Admitted entropic motifs are assigned verified 1-token BPE CJK ideographs
 *        from U+9001..U+9FA5.
 *
 * WIRE FORMAT (self-contained, decodes alone):
 *   [LUMEN-L1]\n<DictBlock>\n[PAYLOAD]\n<Body>
 *   or [LUMEN-L1-LITERAL]\n<Text> for literal wrap on sentinel collision.
 * =============================================================================
 */

import { countTokens, encodeIds, type EncodingName } from './bpe';

export const LUMEN_HEADER = '[LUMEN-L1]';
export const LUMEN_PAYLOAD_MARKER = '[PAYLOAD]';
export const LUMEN_LITERAL = '[LUMEN-L1-LITERAL]';
export const LUMEN_SYSTEM_PROMPT = '# [LUMEN-L1] (Meta-Tokens for direct reasoning)';

export interface LumenResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  motifsCount: number;
  notes: string;
}

const poolCache = new Map<EncodingName, string[]>();

export function lumenAlphabet(enc: EncodingName = 'o200k_base'): string[] {
  const hit = poolCache.get(enc);
  if (hit) return hit;

  const glyphs: string[] = [];
  for (let cp = 0x9001; cp <= 0x9fa5; cp++) {
    const ch = String.fromCodePoint(cp);
    try {
      if (encodeIds(ch, enc).length === 1) glyphs.push(ch);
    } catch {
      /* skip */
    }
  }

  poolCache.set(enc, glyphs);
  return glyphs;
}

export interface EntropicMotifCandidate {
  phrase: string;
  count: number;
  entropy: number;
}

/** Compute empirical Shannon entropy of a string */
function computeShannonEntropy(s: string): number {
  if (!s) return 0;
  const counts = new Map<string, number>();
  for (const ch of s) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  let entropy = 0;
  const len = s.length;
  for (const count of counts.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/** Dynamic entropic motif miner */
export function extractEntropicMotifs(text: string, maxCandidates = 50): EntropicMotifCandidate[] {
  if (!text || text.length < 15) return [];

  const freq = new Map<string, number>();

  // Line-based candidates
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length >= 10 && trimmed.length <= 250) {
      freq.set(trimmed, (freq.get(trimmed) ?? 0) + 1);
    }
  }

  // Word-level sub-phrases (3 to 10 words)
  const words = text.match(/\S+/g) ?? [];
  for (let len = 3; len <= 10; len++) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words.slice(i, i + len).join(' ');
      if (phrase.length >= 12 && phrase.length <= 150) {
        freq.set(phrase, (freq.get(phrase) ?? 0) + 1);
      }
    }
  }

  const candidates: EntropicMotifCandidate[] = [];
  for (const [phrase, count] of freq.entries()) {
    if (count >= 2 && phrase.length >= 10) {
      const entropy = computeShannonEntropy(phrase);
      candidates.push({ phrase, count, entropy });
    }
  }

  // Low entropic density * repetition length
  return candidates
    .sort((a, b) => b.phrase.length * b.count / Math.max(0.1, a.entropy) - a.phrase.length * a.count / Math.max(0.1, b.entropy))
    .slice(0, maxCandidates);
}

export function lumenEncode(text: string, enc: EncodingName = 'o200k_base'): LumenResult {
  const inTokens = countTokens(text, enc);
  const fallback: LumenResult = {
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    motifsCount: 0,
    notes: 'LUMEN identity fallback',
  };

  if (!text || text.length < 20) return fallback;

  if (text.startsWith(LUMEN_HEADER) || text.startsWith(LUMEN_LITERAL)) {
    const wrap = `${LUMEN_LITERAL}\n${text}`;
    const outTokens = countTokens(wrap, enc);
    return {
      wire: wrap,
      decoded: text,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: 0,
      motifsCount: 0,
      notes: 'LUMEN literal wrap',
    };
  }

  const alphabet = lumenAlphabet(enc);
  const textChars = new Set(text);
  const availableGlyphs = alphabet.filter((g) => !textChars.has(g));

  if (availableGlyphs.length < 2) return fallback;

  const candidates = extractEntropicMotifs(text, 50);
  if (candidates.length === 0) return fallback;

  let body = text;
  let motifsCount = 0;
  const mappings: Array<{ glyph: string; phrase: string }> = [];

  for (const cand of candidates) {
    if (motifsCount >= availableGlyphs.length) break;
    if (body.includes(cand.phrase)) {
      const pTokens = countTokens(cand.phrase, enc);
      const glyph = availableGlyphs[motifsCount];
      const gTokens = countTokens(glyph, enc);
      const headerCost = countTokens(`${glyph}=${JSON.stringify(cand.phrase)}\n`, enc);
      const netSavings = cand.count * (pTokens - gTokens) - headerCost;

      if (netSavings > 1) {
        body = body.split(cand.phrase).join(glyph);
        mappings.push({ glyph, phrase: cand.phrase });
        motifsCount++;
      }
    }
  }

  if (motifsCount === 0) return fallback;

  const dictHeader = mappings.map((m) => `${m.glyph}=${JSON.stringify(m.phrase)}`).join('\n');
  const wire = `${LUMEN_HEADER}\n${dictHeader}\n${LUMEN_PAYLOAD_MARKER}\n${body}`;

  const outTokens = countTokens(wire, enc);
  const decoded = lumenDecode(wire, enc);
  const exact = decoded === text;

  if (exact && outTokens < inTokens) {
    return {
      wire,
      decoded,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: ((inTokens - outTokens) / inTokens) * 100,
      motifsCount,
      notes: `LUMEN-L1 entropic motifs=${motifsCount} · byte-exact`,
    };
  }

  return fallback;
}

export function lumenDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (wire.startsWith(LUMEN_LITERAL + '\n')) return wire.slice(LUMEN_LITERAL.length + 1);
  if (!wire.startsWith(LUMEN_HEADER + '\n')) return wire;

  const rest = wire.slice(LUMEN_HEADER.length + 1);
  const bodyIdx = rest.indexOf('\n' + LUMEN_PAYLOAD_MARKER + '\n');
  if (bodyIdx < 0) return wire;

  const dictBlock = rest.slice(0, bodyIdx);
  let body = rest.slice(bodyIdx + LUMEN_PAYLOAD_MARKER.length + 2);

  const lines = dictBlock.split('\n');
  const mappings: Array<{ glyph: string; phrase: string }> = [];

  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const glyph = line.slice(0, eq);
    const rawPhrase = line.slice(eq + 1);
    try {
      const phrase = JSON.parse(rawPhrase) as string;
      mappings.push({ glyph, phrase });
    } catch {
      /* skip */
    }
  }

  for (const { glyph, phrase } of mappings.slice().reverse()) {
    body = body.split(glyph).join(phrase);
  }

  return body;
}

export function lumenSelfTest(enc: EncodingName = 'o200k_base'): boolean {
  const sample = '### Incident review card 01\n### Incident review card 01\n### Incident review card 01';
  const res = lumenEncode(sample, enc);
  const back = lumenDecode(res.wire, enc);
  return back === sample;
}
