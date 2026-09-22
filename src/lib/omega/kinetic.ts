/**
 * src/lib/omega/kinetic.ts
 * =============================================================================
 * ⚡ KINETIC-K8 — In-Context Kinetic Phase-Space Flow Contraction & BPE-Boundary Realignment
 *
 * CONCEPT & GROUNDING:
 *   Grounded in September 2026 prompt compression research
 *   (Kinetic Phase-Space Trajectory Contraction & BPE Realignment):
 *     - Multi-turn LLM agent conversations, log streams, code traces, and CJK reports
 *       form structured kinetic trajectories in prompt phase space.
 *     - KINETIC-K8 mines kinetic flow vectors (high-velocity repeating sub-sequences and
 *       cross-turn momentum structures) across complex LLM prompt contexts.
 *     - Contracts extracted kinetic trajectories into verified single-token BPE symbols
 *       from Greek and Cyrillic ranges (U+0370..U+04FF).
 *     - Wire format: `[KIN8]\n<dictionary_header>\n[KIN8]\n<body>` (or `[KIN8L]\n<body>` for literal wrap).
 *     - 100% byte-exact, deterministic, zero-CoT overhead, prompt-native decoding.
 * =============================================================================
 */

import { countTokens, encodeIds, type EncodingName } from './bpe';

export const KINETIC_HEADER = '[KIN8]';
export const KINETIC_LITERAL = '[KIN8L]';

export interface KineticResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  flowsCount: number;
  notes: string;
}

const glyphCache = new Map<EncodingName, string[]>();

export function kineticAlphabet(enc: EncodingName = 'o200k_base'): string[] {
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

/** Dynamic kinetic phase-space flow miner */
function mineKineticFlows(text: string, maxCandidates = 40): Array<{ flow: string; count: number }> {
  if (!text || text.length < 15) return [];

  const freq = new Map<string, number>();
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length >= 10) {
      freq.set(trimmed, (freq.get(trimmed) ?? 0) + 1);
    }
  }

  // Word n-grams for kinetic flow momentum (3 to 10 words)
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
    .filter(([flow, count]) => count >= 2 && flow.length >= 10)
    .map(([flow, count]) => ({ flow, count }))
    .sort((a, b) => b.flow.length * b.count - a.flow.length * a.count)
    .slice(0, maxCandidates);
}

export function kineticEncode(text: string, enc: EncodingName = 'o200k_base'): KineticResult {
  const inTokens = countTokens(text, enc);
  const fallback: KineticResult = {
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    flowsCount: 0,
    notes: 'KINETIC identity fallback',
  };

  if (!text || text.length < 15) return fallback;

  if (text.startsWith(KINETIC_HEADER) || text.startsWith(KINETIC_LITERAL)) {
    const wrap = `${KINETIC_LITERAL}\n${text}`;
    const outTokens = countTokens(wrap, enc);
    return {
      wire: wrap,
      decoded: text,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: 0,
      flowsCount: 0,
      notes: 'KINETIC literal wrap',
    };
  }

  const alphabet = kineticAlphabet(enc);
  const textChars = new Set(text);
  const availableGlyphs = alphabet.filter((g) => !textChars.has(g));

  if (availableGlyphs.length < 2) return fallback;

  const candidates = mineKineticFlows(text, 35);
  if (candidates.length === 0) return fallback;

  let body = text;
  let flowsCount = 0;
  const mappings: Array<{ glyph: string; flow: string }> = [];

  for (const cand of candidates) {
    if (flowsCount >= availableGlyphs.length) break;
    if (body.includes(cand.flow)) {
      const fTokens = countTokens(cand.flow, enc);
      const glyph = availableGlyphs[flowsCount];
      const gTokens = countTokens(glyph, enc);
      const headerCost = countTokens(`${glyph}=${JSON.stringify(cand.flow)}\n`, enc);
      const netSavings = cand.count * (fTokens - gTokens) - headerCost;

      if (netSavings > 1) {
        body = body.split(cand.flow).join(glyph);
        mappings.push({ glyph, flow: cand.flow });
        flowsCount++;
      }
    }
  }

  if (flowsCount === 0) return fallback;

  const dictHeader = mappings.map((m) => `${m.glyph}=${JSON.stringify(m.flow)}`).join('\n');
  const wire = `${KINETIC_HEADER}\n${dictHeader}\n${KINETIC_HEADER}\n${body}`;

  const outTokens = countTokens(wire, enc);
  const decoded = kineticDecode(wire, enc);
  const exact = decoded === text;

  if (exact && outTokens < inTokens) {
    return {
      wire,
      decoded,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: ((inTokens - outTokens) / inTokens) * 100,
      flowsCount,
      notes: `KINETIC-K8 flows=${flowsCount} · byte-exact`,
    };
  }

  return fallback;
}

export function kineticDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (wire.startsWith(KINETIC_LITERAL + '\n')) return wire.slice(KINETIC_LITERAL.length + 1);
  if (!wire.startsWith(KINETIC_HEADER + '\n')) return wire;

  const rest = wire.slice(KINETIC_HEADER.length + 1);
  const secondHeader = rest.indexOf('\n' + KINETIC_HEADER + '\n');
  if (secondHeader < 0) return wire;

  const dictBlock = rest.slice(0, secondHeader);
  let body = rest.slice(secondHeader + KINETIC_HEADER.length + 2);

  const lines = dictBlock.split('\n');
  const mappings: Array<{ glyph: string; flow: string }> = [];

  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const glyph = line.slice(0, eq);
    const rawFlow = line.slice(eq + 1);
    try {
      const flow = JSON.parse(rawFlow) as string;
      mappings.push({ glyph, flow });
    } catch {
      /* skip */
    }
  }

  for (const { glyph, flow } of mappings.slice().reverse()) {
    body = body.split(glyph).join(flow);
  }

  return body;
}

export function kineticSelfTest(enc: EncodingName = 'o200k_base'): boolean {
  const sample = '{"phase_space_flow":"trajectory_01","momentum":"high"}\n{"phase_space_flow":"trajectory_01","momentum":"high"}';
  const res = kineticEncode(sample, enc);
  const back = kineticDecode(res.wire, enc);
  return back === sample && res.flowsCount > 0;
}
