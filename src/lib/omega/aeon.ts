/**
 * src/lib/omega/aeon.ts
 * =============================================================================
 * ♾ AEON-A1 — In-Context Dynamic Attractor Frame Delta Quotient Encoding
 *
 * DYNAMIC ALGORITHM:
 *   - Models recurring multi-turn attractor frames and multi-turn context blocks
 *     by dynamically mining multi-line repeating frames across agent turns.
 *   - Contracts extracted attractor frames into 1-token BPE symbols from Greek/Cyrillic
 *     ranges (U+0386..U+044F).
 *   - Wire format: `ϯ<body>` (or `ϯϯ<body>` for literal wrap).
 *   - 100% byte-exact, deterministic, zero-CoT overhead, prompt-native decoding.
 * =============================================================================
 */

import { countTokens, encodeIds, type EncodingName } from './bpe';

export const AEON_SENTINEL = 'ϯ';
export const AEON_LITERAL = 'ϯϯ';

export interface AeonResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  attractors: number;
  notes: string;
}

const glyphCache = new Map<EncodingName, string[]>();

export function aeonAlphabet(enc: EncodingName = 'o200k_base'): string[] {
  const hit = glyphCache.get(enc);
  if (hit) return hit;

  const glyphs: string[] = [];
  for (let cp = 0x0386; cp <= 0x044f; cp++) {
    const ch = String.fromCodePoint(cp);
    if (ch === AEON_SENTINEL) continue;
    try {
      if (encodeIds(ch, enc).length === 1) glyphs.push(ch);
    } catch {
      /* skip */
    }
  }

  glyphCache.set(enc, glyphs);
  return glyphs;
}

/** Dynamic multi-line attractor frame miner */
function extractDynamicAttractorFrames(text: string, maxCandidates = 50): Array<{ frame: string; count: number }> {
  const freq = new Map<string, number>();
  if (!text || text.length < 20) return [];

  const lines = text.split('\n');

  // Multi-line window (2 to 5 lines)
  for (let windowSize = 2; windowSize <= 5; windowSize++) {
    for (let i = 0; i <= lines.length - windowSize; i++) {
      const block = lines.slice(i, i + windowSize).join('\n');
      if (block.length >= 15 && block.length <= 300) {
        freq.set(block, (freq.get(block) ?? 0) + 1);
      }
    }
  }

  // Single recurring long lines
  for (const line of lines) {
    if (line.length >= 15) {
      freq.set(line, (freq.get(line) ?? 0) + 1);
    }
  }

  return Array.from(freq.entries())
    .filter(([frame, count]) => count >= 2 && frame.length >= 15)
    .map(([frame, count]) => ({ frame, count }))
    .sort((a, b) => b.frame.length * b.count - a.frame.length * a.count)
    .slice(0, maxCandidates);
}

export function aeonEncode(text: string, enc: EncodingName = 'o200k_base'): AeonResult {
  const inTokens = countTokens(text, enc);
  const fallback: AeonResult = {
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    attractors: 0,
    notes: 'AEON identity fallback',
  };

  if (!text || text.length < 20) return fallback;

  if (text.startsWith(AEON_SENTINEL)) {
    const wrap = AEON_LITERAL + text;
    const outTokens = countTokens(wrap, enc);
    return {
      wire: wrap,
      decoded: text,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: 0,
      attractors: 0,
      notes: 'AEON literal wrap',
    };
  }

  const alphabet = aeonAlphabet(enc);
  const textChars = new Set(text);
  const availableGlyphs = alphabet.filter((g) => !textChars.has(g));

  if (availableGlyphs.length < 2) return fallback;

  const candidates = extractDynamicAttractorFrames(text, 40);
  if (candidates.length === 0) return fallback;

  let body = text;
  let attractors = 0;
  const mappings: Array<{ glyph: string; frame: string }> = [];

  for (const cand of candidates) {
    if (attractors >= availableGlyphs.length) break;
    if (body.includes(cand.frame)) {
      const fTokens = countTokens(cand.frame, enc);
      const glyph = availableGlyphs[attractors];
      const gTokens = countTokens(glyph, enc);
      const headerCost = countTokens(`${glyph}=${JSON.stringify(cand.frame)}\n`, enc);
      const netSavings = cand.count * (fTokens - gTokens) - headerCost;

      if (netSavings > 1) {
        body = body.split(cand.frame).join(glyph);
        mappings.push({ glyph, frame: cand.frame });
        attractors++;
      }
    }
  }

  if (attractors === 0) return fallback;

  const dictHeader = mappings.map((m) => `${m.glyph}=${JSON.stringify(m.frame)}`).join('\n');
  const wire = `${AEON_SENTINEL}\n${dictHeader}\n${AEON_SENTINEL}\n${body}`;

  const outTokens = countTokens(wire, enc);
  const decoded = aeonDecode(wire, enc);
  const exact = decoded === text;

  if (exact && outTokens < inTokens) {
    return {
      wire,
      decoded,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: ((inTokens - outTokens) / inTokens) * 100,
      attractors,
      notes: `AEON-A1 attractors=${attractors} · byte-exact`,
    };
  }

  return fallback;
}

export function aeonDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (wire.startsWith(AEON_LITERAL)) return wire.slice(2);
  if (!wire.startsWith(AEON_SENTINEL + '\n')) return wire;

  const rest = wire.slice(2);
  const secondSentinel = rest.indexOf('\n' + AEON_SENTINEL + '\n');
  if (secondSentinel < 0) return wire;

  const dictBlock = rest.slice(0, secondSentinel);
  let body = rest.slice(secondSentinel + 3);

  const lines = dictBlock.split('\n');
  const mappings: Array<{ glyph: string; frame: string }> = [];

  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const glyph = line.slice(0, eq);
    const rawFrame = line.slice(eq + 1);
    try {
      const frame = JSON.parse(rawFrame) as string;
      mappings.push({ glyph, frame });
    } catch {
      /* skip */
    }
  }

  for (const { glyph, frame } of mappings.slice().reverse()) {
    body = body.split(glyph).join(frame);
  }

  return body;
}

export function aeonSelfTest(enc: EncodingName = 'o200k_base'): boolean {
  const sample = 'user: run step 0\nassistant: step 0 completed\nuser: run step 0\nassistant: step 0 completed';
  const res = aeonEncode(sample, enc);
  const back = aeonDecode(res.wire, enc);
  return back === sample;
}
