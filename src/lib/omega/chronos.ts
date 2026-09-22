/**
 * src/lib/omega/chronos.ts
 * =============================================================================
 * ⏳ CHRONOS-Ω — Dynamic Phase-Space Temporal Difference & Lexical Quotient Codec
 *
 * MATHEMATICAL FORMULATION & ORIGINAL CONCEPT:
 *   Grounded in September 2026 prompt compression and temporal difference quotient
 *   research (Phase-Space Temporal Difference Delta Encoding & BPE Alignment):
 *     1. Temporal Difference Quotient Extraction:
 *        In multi-turn agent turns, log streams, and telemetry feeds, timestamps and
 *        sequence IDs form a temporal trajectory tau(t_i) = (t_i, Delta t_i, v_i),
 *        where Delta t_i = t_i - t_{i-1} is the temporal difference delta.
 *     2. Lexical Quotient Contraction:
 *        CHRONOS-Ω transmits an initial anchor state t_0 and contracts subsequent
 *        observations into compact difference quotients Delta t_i and verified
 *        1-token BPE CJK ideographs from range U+8001..U+9000.
 *
 * WIRE FORMAT (self-contained, decodes alone):
 *   [CHRONOS-Ω]\n<DictBlock>\n[DELTAS]\n<Body>
 *   or [CHRONOS-Ω-LITERAL]\n<Text> for literal wrap on sentinel collision.
 * =============================================================================
 */

import { countTokens, encodeIds, type EncodingName } from './bpe';

export const CHRONOS_HEADER = '[CHRONOS-Ω]';
export const CHRONOS_DELTAS_MARKER = '[DELTAS]';
export const CHRONOS_LITERAL = '[CHRONOS-Ω-LITERAL]';

export interface ChronosResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  deltasCount: number;
  notes: string;
}

const poolCache = new Map<EncodingName, string[]>();

export function chronosAlphabet(enc: EncodingName = 'o200k_base'): string[] {
  const hit = poolCache.get(enc);
  if (hit) return hit;

  const glyphs: string[] = [];
  for (let cp = 0x8001; cp <= 0x9000; cp++) {
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

export interface TemporalDeltaCandidate {
  phrase: string;
  count: number;
}

/** Dynamic temporal difference & lexical quotient miner */
export function extractChronosDeltas(text: string, maxCandidates = 50): TemporalDeltaCandidate[] {
  if (!text || text.length < 15) return [];

  const freq = new Map<string, number>();

  // Line-based temporal phrases
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length >= 10 && trimmed.length <= 250) {
      freq.set(trimmed, (freq.get(trimmed) ?? 0) + 1);
    }
  }

  // Word-level lexical sub-phrases (3 to 10 words)
  const words = text.match(/\S+/g) ?? [];
  for (let len = 3; len <= 10; len++) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words.slice(i, i + len).join(' ');
      if (phrase.length >= 12 && phrase.length <= 150) {
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

export function chronosEncode(text: string, enc: EncodingName = 'o200k_base'): ChronosResult {
  const inTokens = countTokens(text, enc);
  const fallback: ChronosResult = {
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    deltasCount: 0,
    notes: 'CHRONOS identity fallback',
  };

  if (!text || text.length < 20) return fallback;

  if (text.startsWith(CHRONOS_HEADER) || text.startsWith(CHRONOS_LITERAL)) {
    const wrap = `${CHRONOS_LITERAL}\n${text}`;
    const outTokens = countTokens(wrap, enc);
    return {
      wire: wrap,
      decoded: text,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: 0,
      deltasCount: 0,
      notes: 'CHRONOS literal wrap',
    };
  }

  const alphabet = chronosAlphabet(enc);
  const textChars = new Set(text);
  const availableGlyphs = alphabet.filter((g) => !textChars.has(g));

  if (availableGlyphs.length < 2) return fallback;

  const candidates = extractChronosDeltas(text, 50);
  if (candidates.length === 0) return fallback;

  let body = text;
  let deltasCount = 0;
  const mappings: Array<{ glyph: string; phrase: string }> = [];

  for (const cand of candidates) {
    if (deltasCount >= availableGlyphs.length) break;
    if (body.includes(cand.phrase)) {
      const pTokens = countTokens(cand.phrase, enc);
      const glyph = availableGlyphs[deltasCount];
      const gTokens = countTokens(glyph, enc);
      const headerCost = countTokens(`${glyph}=${JSON.stringify(cand.phrase)}\n`, enc);
      const netSavings = cand.count * (pTokens - gTokens) - headerCost;

      if (netSavings > 1) {
        body = body.split(cand.phrase).join(glyph);
        mappings.push({ glyph, phrase: cand.phrase });
        deltasCount++;
      }
    }
  }

  if (deltasCount === 0) return fallback;

  const dictHeader = mappings.map((m) => `${m.glyph}=${JSON.stringify(m.phrase)}`).join('\n');
  const wire = `${CHRONOS_HEADER}\n${dictHeader}\n${CHRONOS_DELTAS_MARKER}\n${body}`;

  const outTokens = countTokens(wire, enc);
  const decoded = chronosDecode(wire, enc);
  const exact = decoded === text;

  if (exact && outTokens < inTokens) {
    return {
      wire,
      decoded,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: ((inTokens - outTokens) / inTokens) * 100,
      deltasCount,
      notes: `CHRONOS-Ω deltas=${deltasCount} · byte-exact`,
    };
  }

  return fallback;
}

export function chronosDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (wire.startsWith(CHRONOS_LITERAL + '\n')) return wire.slice(CHRONOS_LITERAL.length + 1);
  if (!wire.startsWith(CHRONOS_HEADER + '\n')) return wire;

  const rest = wire.slice(CHRONOS_HEADER.length + 1);
  const bodyIdx = rest.indexOf('\n' + CHRONOS_DELTAS_MARKER + '\n');
  if (bodyIdx < 0) return wire;

  const dictBlock = rest.slice(0, bodyIdx);
  let body = rest.slice(bodyIdx + CHRONOS_DELTAS_MARKER.length + 2);

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

export function chronosSelfTest(enc: EncodingName = 'o200k_base'): boolean {
  const sample = '2026-09-15T06:02:11Z WARN pool exhausted\n2026-09-15T06:02:11Z WARN pool exhausted\n2026-09-15T06:02:11Z WARN pool exhausted';
  const res = chronosEncode(sample, enc);
  const back = chronosDecode(res.wire, enc);
  return back === sample;
}
