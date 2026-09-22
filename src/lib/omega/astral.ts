/**
 * src/lib/omega/astral.ts
 * =============================================================================
 * 🌌 ASTRAL-A1 — Adaptive Structural & Textual Representation for Agentic Languages
 *
 * DYNAMIC ALGORITHM:
 *   - Scans arbitrary input text for high-frequency multi-token structural collocations
 *     and multi-word instruction patterns using dynamic n-gram frequency extraction.
 *   - Calculates real BPE token savings for each dynamic collocation.
 *   - Replaces top-saving collocations using single-token BPE symbols from verified
 *     Greek/Cyrillic ranges (U+0370..U+03FF, U+0400..U+04FF).
 *   - 100% byte-exact, deterministic, zero-CoT overhead, prompt-native decoding.
 * =============================================================================
 */

import { countTokens, encodeIds, type EncodingName } from './bpe';

export const ASTRAL_SENTINEL = 'α';
export const ASTRAL_LITERAL = 'αα';

export interface AstralResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  substitutions: number;
  notes: string;
}

const glyphCache = new Map<EncodingName, string[]>();

export function astralAlphabet(enc: EncodingName = 'o200k_base'): string[] {
  const hit = glyphCache.get(enc);
  if (hit) return hit;

  const glyphs: string[] = [];
  for (let cp = 0x0370; cp <= 0x04ff; cp++) {
    const ch = String.fromCodePoint(cp);
    if (ch === ASTRAL_SENTINEL) continue;
    try {
      if (encodeIds(ch, enc).length === 1) glyphs.push(ch);
    } catch {
      /* skip */
    }
  }

  glyphCache.set(enc, glyphs);
  return glyphs;
}

/** Dynamic n-gram & multi-word collocation miner */
function extractDynamicCollocations(text: string, maxCandidates = 100): Array<{ phrase: string; count: number }> {
  const freq = new Map<string, number>();
  if (!text || text.length < 15) return [];

  // Line-based phrases
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length >= 10 && trimmed.length <= 150) {
      freq.set(trimmed, (freq.get(trimmed) ?? 0) + 1);
    }
  }

  // Word n-grams (3 to 8 words)
  const words = text.match(/\S+/g) ?? [];
  for (let len = 3; len <= 8; len++) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words.slice(i, i + len).join(' ');
      if (phrase.length >= 12 && phrase.length <= 120) {
        freq.set(phrase, (freq.get(phrase) ?? 0) + 1);
      }
    }
  }

  return Array.from(freq.entries())
    .filter(([phrase, count]) => count >= 2 && phrase.length >= 10)
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.phrase.length * b.count - a.phrase.length * a.count)
    .slice(0, maxCandidates);
}

export function astralEncode(text: string, enc: EncodingName = 'o200k_base'): AstralResult {
  const inTokens = countTokens(text, enc);
  const fallback: AstralResult = {
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    substitutions: 0,
    notes: 'ASTRAL identity fallback',
  };

  if (!text || text.length < 15) return fallback;

  if (text.startsWith(ASTRAL_SENTINEL)) {
    const wrap = ASTRAL_LITERAL + text;
    const outTokens = countTokens(wrap, enc);
    return {
      wire: wrap,
      decoded: text,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: 0,
      substitutions: 0,
      notes: 'ASTRAL literal wrap',
    };
  }

  const alphabet = astralAlphabet(enc);
  const textChars = new Set(text);
  const availableGlyphs = alphabet.filter((g) => !textChars.has(g));

  if (availableGlyphs.length < 2) return fallback;

  // Extract dynamic candidates from text
  const candidates = extractDynamicCollocations(text, 50);
  if (candidates.length === 0) return fallback;

  let body = text;
  let subs = 0;
  const mappings: Array<{ glyph: string; phrase: string }> = [];

  for (const cand of candidates) {
    if (subs >= availableGlyphs.length) break;
    if (body.includes(cand.phrase)) {
      const pTokens = countTokens(cand.phrase, enc);
      const glyph = availableGlyphs[subs];
      const gTokens = countTokens(glyph, enc);
      const headerCost = countTokens(`${glyph}=${JSON.stringify(cand.phrase)}\n`, enc);
      const netSavings = cand.count * (pTokens - gTokens) - headerCost;

      if (netSavings > 1) {
        body = body.split(cand.phrase).join(glyph);
        mappings.push({ glyph, phrase: cand.phrase });
        subs++;
      }
    }
  }

  if (subs === 0) return fallback;

  const dictHeader = mappings.map((m) => `${m.glyph}=${JSON.stringify(m.phrase)}`).join('\n');
  const wire = `${ASTRAL_SENTINEL}\n${dictHeader}\n${ASTRAL_SENTINEL}\n${body}`;

  const outTokens = countTokens(wire, enc);
  const decoded = astralDecode(wire, enc);
  const exact = decoded === text;

  if (exact && outTokens < inTokens) {
    return {
      wire,
      decoded,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: ((inTokens - outTokens) / inTokens) * 100,
      substitutions: subs,
      notes: `ASTRAL-A1 substitutions=${subs} · byte-exact`,
    };
  }

  return fallback;
}

export function astralDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (wire.startsWith(ASTRAL_LITERAL)) return wire.slice(2);
  if (!wire.startsWith(ASTRAL_SENTINEL + '\n')) return wire;

  const rest = wire.slice(2);
  const secondSentinel = rest.indexOf('\n' + ASTRAL_SENTINEL + '\n');
  if (secondSentinel < 0) return wire;

  const dictBlock = rest.slice(0, secondSentinel);
  let body = rest.slice(secondSentinel + 3);

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

  for (const { glyph, phrase } of mappings) {
    body = body.split(glyph).join(phrase);
  }

  return body;
}

export function astralSelfTest(enc: EncodingName = 'o200k_base'): boolean {
  const sample = '### Incident review card 01\n### Incident review card 02\n### Incident review card 03';
  const res = astralEncode(sample, enc);
  const back = astralDecode(res.wire, enc);
  return back === sample;
}
