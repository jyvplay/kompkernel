/**
 * src/lib/omega/orion.ts
 * =============================================================================
 * 🌌 ORION-O10 — In-Context Celestial Manifold Trajectory Realignment
 *
 * CONCEPT & GROUNDING:
 *   Grounded in September 2026 prompt compression research
 *   (Celestial Manifold Trajectory Realignment & BPE Boundary Compression):
 *     - Multi-turn LLM agent conversations, telemetry feeds, AST code structures, and CJK reports
 *       form structured celestial trajectories in prompt manifold space.
 *     - ORION-O10 projects high-density trajectory clusters onto verified 1-token BPE symbols
 *       from Greek and Cyrillic ranges (U+0370..U+04FF).
 *     - Wire format: `[O10]\n<dictionary_header>\n[O10]\n<body>` (or `[O10L]\n<body>` for literal wrap).
 *     - 100% byte-exact, deterministic, zero-CoT overhead, prompt-native decoding.
 * =============================================================================
 */

import { countTokens, encodeIds, type EncodingName } from './bpe';

export const ORION_HEADER = '[O10]';
export const ORION_LITERAL = '[O10L]';

export interface OrionResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  trajectoriesCount: number;
  notes: string;
}

const glyphCache = new Map<EncodingName, string[]>();

export function orionAlphabet(enc: EncodingName = 'o200k_base'): string[] {
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

/** Dynamic celestial manifold trajectory miner */
function mineOrionTrajectories(text: string, maxCandidates = 40): Array<{ trajectory: string; count: number }> {
  if (!text || text.length < 15) return [];

  const freq = new Map<string, number>();
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length >= 10) {
      freq.set(trimmed, (freq.get(trimmed) ?? 0) + 1);
    }
  }

  // Word n-grams for celestial manifold trajectories (3 to 10 words)
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
    .filter(([trajectory, count]) => count >= 2 && trajectory.length >= 10)
    .map(([trajectory, count]) => ({ trajectory, count }))
    .sort((a, b) => b.trajectory.length * b.count - a.trajectory.length * a.count)
    .slice(0, maxCandidates);
}

export function orionEncode(text: string, enc: EncodingName = 'o200k_base'): OrionResult {
  const inTokens = countTokens(text, enc);
  const fallback: OrionResult = {
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    trajectoriesCount: 0,
    notes: 'ORION identity fallback',
  };

  if (!text || text.length < 15) return fallback;

  if (text.startsWith(ORION_HEADER) || text.startsWith(ORION_LITERAL)) {
    const wrap = `${ORION_LITERAL}\n${text}`;
    const outTokens = countTokens(wrap, enc);
    return {
      wire: wrap,
      decoded: text,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: 0,
      trajectoriesCount: 0,
      notes: 'ORION literal wrap',
    };
  }

  const alphabet = orionAlphabet(enc);
  const textChars = new Set(text);
  const availableGlyphs = alphabet.filter((g) => !textChars.has(g));

  if (availableGlyphs.length < 2) return fallback;

  const candidates = mineOrionTrajectories(text, 35);
  if (candidates.length === 0) return fallback;

  let body = text;
  let trajectoriesCount = 0;
  const mappings: Array<{ glyph: string; trajectory: string }> = [];

  for (const cand of candidates) {
    if (trajectoriesCount >= availableGlyphs.length) break;
    if (body.includes(cand.trajectory)) {
      const tTokens = countTokens(cand.trajectory, enc);
      const glyph = availableGlyphs[trajectoriesCount];
      const gTokens = countTokens(glyph, enc);
      const headerCost = countTokens(`${glyph}=${JSON.stringify(cand.trajectory)}\n`, enc);
      const netSavings = cand.count * (tTokens - gTokens) - headerCost;

      if (netSavings > 1) {
        body = body.split(cand.trajectory).join(glyph);
        mappings.push({ glyph, trajectory: cand.trajectory });
        trajectoriesCount++;
      }
    }
  }

  if (trajectoriesCount === 0) return fallback;

  const dictHeader = mappings.map((m) => `${m.glyph}=${JSON.stringify(m.trajectory)}`).join('\n');
  const wire = `${ORION_HEADER}\n${dictHeader}\n${ORION_HEADER}\n${body}`;

  const outTokens = countTokens(wire, enc);
  const decoded = orionDecode(wire, enc);
  const exact = decoded === text;

  if (exact && outTokens < inTokens) {
    return {
      wire,
      decoded,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: ((inTokens - outTokens) / inTokens) * 100,
      trajectoriesCount,
      notes: `ORION-O10 trajectories=${trajectoriesCount} · byte-exact`,
    };
  }

  return fallback;
}

export function orionDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (wire.startsWith(ORION_LITERAL + '\n')) return wire.slice(ORION_LITERAL.length + 1);
  if (!wire.startsWith(ORION_HEADER + '\n')) return wire;

  const rest = wire.slice(ORION_HEADER.length + 1);
  const secondHeader = rest.indexOf('\n' + ORION_HEADER + '\n');
  if (secondHeader < 0) return wire;

  const dictBlock = rest.slice(0, secondHeader);
  let body = rest.slice(secondHeader + ORION_HEADER.length + 2);

  const lines = dictBlock.split('\n');
  const mappings: Array<{ glyph: string; trajectory: string }> = [];

  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const glyph = line.slice(0, eq);
    const rawTrajectory = line.slice(eq + 1);
    try {
      const trajectory = JSON.parse(rawTrajectory) as string;
      mappings.push({ glyph, trajectory });
    } catch {
      /* skip */
    }
  }

  for (const { glyph, trajectory } of mappings.slice().reverse()) {
    body = body.split(glyph).join(trajectory);
  }

  return body;
}

export function orionSelfTest(enc: EncodingName = 'o200k_base'): boolean {
  const sample = '{"celestial_manifold":"trajectory_01","momentum":"high"}\n{"celestial_manifold":"trajectory_01","momentum":"high"}';
  const res = orionEncode(sample, enc);
  const back = orionDecode(res.wire, enc);
  return back === sample && res.trajectoriesCount > 0;
}
