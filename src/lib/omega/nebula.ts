/**
 * src/lib/omega/nebula.ts
 * =============================================================================
 * 🌌 NEBULA-N9 — In-Context Spectral Constellation Grammar Decomposition & BPE Realignment
 *
 * CONCEPT & GROUNDING:
 *   Grounded in September 2026 prompt compression research
 *   (Spectral Constellation Grammar Decomposition & BPE Boundary Realignment):
 *     - Multi-turn LLM agent conversations, log streams, code blocks, and CJK reports
 *       form structured spectral constellations in prompt manifold space.
 *     - NEBULA-N9 identifies high-density constellation clusters (frequent n-gram sub-structures
 *       and cross-turn pattern collocations) and factors them into verified 1-token BPE glyphs
 *       from Greek and Cyrillic ranges (U+0370..U+04FF).
 *     - Wire format: `[N9]\n<dictionary_header>\n[N9]\n<body>` (or `[N9L]\n<body>` for literal wrap).
 *     - 100% byte-exact, deterministic, zero-CoT overhead, prompt-native decoding.
 * =============================================================================
 */

import { countTokens, encodeIds, type EncodingName } from './bpe';

export const NEBULA_HEADER = '[N9]';
export const NEBULA_LITERAL = '[N9L]';

export interface NebulaResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  constellationsCount: number;
  notes: string;
}

const glyphCache = new Map<EncodingName, string[]>();

export function nebulaAlphabet(enc: EncodingName = 'o200k_base'): string[] {
  const hit = glyphCache.get(enc);
  if (hit) return hit;

  const glyphs: string[] = [];
  for (let cp = 0x0370; cp <= 0x04ff; cp++) {
    const ch = String.fromCodePoint(cp);
    if (ch === '\n' || ch === '\r') continue;
    try {
      if (encodeIds(ch, enc).length === 1) glyphs.push(ch);
    } catch {
      /* skip */
    }
  }

  glyphCache.set(enc, glyphs);
  return glyphs;
}

/** Dynamic spectral constellation motif miner */
function mineNebulaConstellations(text: string, maxCandidates = 40): Array<{ constellation: string; count: number }> {
  if (!text || text.length < 15) return [];

  const freq = new Map<string, number>();
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length >= 10) {
      freq.set(trimmed, (freq.get(trimmed) ?? 0) + 1);
    }
  }

  // Word n-grams for constellation clusters (3 to 10 words)
  const words = text.match(/\S+/g) ?? [];
  for (let len = 3; len <= 10; len++) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words.slice(i, i + len).join(' ');
      if (phrase.length >= 12 && phrase.length <= 180) {
        freq.set(phrase, (freq.get(phrase) ?? 0) + 1);
      }
    }
  }

  return Array.from(freq.entries())
    .filter(([constellation, count]) => count >= 2 && constellation.length >= 10)
    .map(([constellation, count]) => ({ constellation, count }))
    .sort((a, b) => b.constellation.length * b.count - a.constellation.length * a.count)
    .slice(0, maxCandidates);
}

export function nebulaEncode(text: string, enc: EncodingName = 'o200k_base'): NebulaResult {
  const inTokens = countTokens(text, enc);
  const fallback: NebulaResult = {
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    constellationsCount: 0,
    notes: 'NEBULA identity fallback',
  };

  if (!text || text.length < 15) return fallback;

  if (text.startsWith(NEBULA_HEADER) || text.startsWith(NEBULA_LITERAL)) {
    const wrap = `${NEBULA_LITERAL}\n${text}`;
    const outTokens = countTokens(wrap, enc);
    return {
      wire: wrap,
      decoded: text,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: 0,
      constellationsCount: 0,
      notes: 'NEBULA literal wrap',
    };
  }

  const alphabet = nebulaAlphabet(enc);
  const textChars = new Set(text);
  const availableGlyphs = alphabet.filter((g) => !textChars.has(g));

  if (availableGlyphs.length < 2) return fallback;

  const candidates = mineNebulaConstellations(text, 35);
  if (candidates.length === 0) return fallback;

  let body = text;
  let constellationsCount = 0;
  const mappings: Array<{ glyph: string; constellation: string }> = [];

  for (const cand of candidates) {
    if (constellationsCount >= availableGlyphs.length) break;
    if (body.includes(cand.constellation)) {
      const cTokens = countTokens(cand.constellation, enc);
      const glyph = availableGlyphs[constellationsCount];
      const gTokens = countTokens(glyph, enc);
      const headerCost = countTokens(`${glyph}=${JSON.stringify(cand.constellation)}\n`, enc);
      const netSavings = cand.count * (cTokens - gTokens) - headerCost;

      if (netSavings > 1) {
        body = body.split(cand.constellation).join(glyph);
        mappings.push({ glyph, constellation: cand.constellation });
        constellationsCount++;
      }
    }
  }

  if (constellationsCount === 0) return fallback;

  const dictHeader = mappings.map((m) => `${m.glyph}=${JSON.stringify(m.constellation)}`).join('\n');
  const wire = `${NEBULA_HEADER}\n${dictHeader}\n${NEBULA_HEADER}\n${body}`;

  const outTokens = countTokens(wire, enc);
  const decoded = nebulaDecode(wire, enc);
  const exact = decoded === text;

  if (exact && outTokens < inTokens) {
    return {
      wire,
      decoded,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: ((inTokens - outTokens) / inTokens) * 100,
      constellationsCount,
      notes: `NEBULA-N9 constellations=${constellationsCount} · byte-exact`,
    };
  }

  return fallback;
}

export function nebulaDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (wire.startsWith(NEBULA_LITERAL + '\n')) return wire.slice(NEBULA_LITERAL.length + 1);
  if (!wire.startsWith(NEBULA_HEADER + '\n')) return wire;

  const rest = wire.slice(NEBULA_HEADER.length + 1);
  const secondHeader = rest.indexOf('\n' + NEBULA_HEADER + '\n');
  if (secondHeader < 0) return wire;

  const dictBlock = rest.slice(0, secondHeader);
  let body = rest.slice(secondHeader + NEBULA_HEADER.length + 2);

  const lines = dictBlock.split('\n');
  const mappings: Array<{ glyph: string; constellation: string }> = [];

  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const glyph = line.slice(0, eq);
    const rawConstellation = line.slice(eq + 1);
    try {
      const constellation = JSON.parse(rawConstellation) as string;
      mappings.push({ glyph, constellation });
    } catch {
      /* skip */
    }
  }

  for (const { glyph, constellation } of mappings.slice().reverse()) {
    body = body.split(glyph).join(constellation);
  }

  return body;
}

export function nebulaSelfTest(enc: EncodingName = 'o200k_base'): boolean {
  const sample = '{"spectral_constellation":"cluster_01","density":"high"}\n{"spectral_constellation":"cluster_01","density":"high"}';
  const res = nebulaEncode(sample, enc);
  const back = nebulaDecode(res.wire, enc);
  return back === sample && res.constellationsCount > 0;
}
