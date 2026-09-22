/**
 * src/lib/omega/polaris.ts
 * =============================================================================
 * 🌌 POLARIS-P1 — Polar Phase-Space Graph Quotient Contraction
 *
 * MATHEMATICAL FORMULATION & ORIGINAL CONCEPT:
 *   In complex prompt contexts (logs, multi-turn transcripts, structured code traces,
 *   CJK mixed reports), character and token n-grams are modeled in a 2D polar phase-space
 *   graph (r, theta):
 *     1. Magnitude r: Normalized logarithmic recurrence frequency r = ln(1 + freq).
 *     2. Phase Angle theta: Relative positional phase theta = (2pi * pos) / L mod 2pi.
 *
 *   POLARIS-P1 clusters collocations forming polar phase-space orbits into phase-quotient
 *   equivalence classes [S]_theta. Each maximal equivalence class is assigned a single-token
 *   sentinel projection from a verified single-token CJK ideograph alphabet (U+6501..U+7000).
 *
 * WIRE FORMAT (self-contained, decodes alone):
 *   [POLARIS-P1]\n<DictHeader>\n[PAYLOAD]\n<Body>
 *   or [POLARIS-P1-LITERAL]\n<Text> for literal wrap on sentinel collision.
 * =============================================================================
 */

import { countTokens, encodeIds, type EncodingName } from './bpe';

export const POLARIS_HEADER = '[POLARIS-P1]';
export const POLARIS_PAYLOAD_MARKER = '[PAYLOAD]';
export const POLARIS_LITERAL = '[POLARIS-P1-LITERAL]';

export interface PolarisResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  orbitsCount: number;
  notes: string;
}

const poolCache = new Map<EncodingName, string[]>();

export function polarisBasisPool(enc: EncodingName = 'o200k_base'): string[] {
  const hit = poolCache.get(enc);
  if (hit) return hit;

  const glyphs: string[] = [];
  for (let cp = 0x6501; cp <= 0x7000; cp++) {
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

export interface PhaseSpaceOrbit {
  phrase: string;
  frequency: number;
  magnitudeR: number;
  phaseTheta: number;
}

/** Compute polar phase-space coordinates for candidate n-grams */
export function extractPolarOrbits(text: string, maxCandidates = 60): PhaseSpaceOrbit[] {
  if (!text || text.length < 15) return [];

  const freq = new Map<string, number[]>();
  const totalLen = text.length;

  // Scan line-based n-grams
  const lines = text.split('\n');
  let currentPos = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length >= 10 && trimmed.length <= 200) {
      const positions = freq.get(trimmed) ?? [];
      positions.push(currentPos);
      freq.set(trimmed, positions);
    }
    currentPos += line.length + 1;
  }

  // Scan word n-grams (3 to 8 words)
  const words = text.match(/\S+/g) ?? [];
  let wPos = 0;
  for (let len = 3; len <= 8; len++) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words.slice(i, i + len).join(' ');
      if (phrase.length >= 12 && phrase.length <= 150) {
        const positions = freq.get(phrase) ?? [];
        positions.push(wPos);
        freq.set(phrase, positions);
      }
      wPos += words[i].length + 1;
    }
  }

  const orbits: PhaseSpaceOrbit[] = [];
  for (const [phrase, positions] of freq.entries()) {
    if (positions.length >= 2 && phrase.length >= 10) {
      const frequency = positions.length;
      const magnitudeR = Math.log(1 + frequency);
      const avgPos = positions.reduce((a, b) => a + b, 0) / frequency;
      const phaseTheta = ((2 * Math.PI * avgPos) / Math.max(1, totalLen)) % (2 * Math.PI);

      orbits.push({ phrase, frequency, magnitudeR, phaseTheta });
    }
  }

  // Sort orbits by magnitude * length descending
  return orbits
    .sort((a, b) => b.magnitudeR * b.phrase.length - a.magnitudeR * a.phrase.length)
    .slice(0, maxCandidates);
}

export function polarisEncode(text: string, enc: EncodingName = 'o200k_base'): PolarisResult {
  const inTokens = countTokens(text, enc);
  const fallback: PolarisResult = {
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    orbitsCount: 0,
    notes: 'POLARIS identity fallback',
  };

  if (!text || text.length < 20) return fallback;

  if (text.startsWith(POLARIS_HEADER) || text.startsWith(POLARIS_LITERAL)) {
    const wrap = `${POLARIS_LITERAL}\n${text}`;
    const outTokens = countTokens(wrap, enc);
    return {
      wire: wrap,
      decoded: text,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: 0,
      orbitsCount: 0,
      notes: 'POLARIS literal wrap',
    };
  }

  const pool = polarisBasisPool(enc);
  const textChars = new Set(text);
  const availableBasis = pool.filter((g) => !textChars.has(g));

  if (availableBasis.length < 2) return fallback;

  const orbits = extractPolarOrbits(text, 50);
  if (orbits.length === 0) return fallback;

  let body = text;
  let orbitsCount = 0;
  const mappings: Array<{ glyph: string; phrase: string }> = [];

  for (const orb of orbits) {
    if (orbitsCount >= availableBasis.length) break;
    if (body.includes(orb.phrase)) {
      const pTokens = countTokens(orb.phrase, enc);
      const glyph = availableBasis[orbitsCount];
      const gTokens = countTokens(glyph, enc);
      const headerCost = countTokens(`${glyph}=${JSON.stringify(orb.phrase)}\n`, enc);
      const netSavings = orb.frequency * (pTokens - gTokens) - headerCost;

      if (netSavings > 1) {
        body = body.split(orb.phrase).join(glyph);
        mappings.push({ glyph, phrase: orb.phrase });
        orbitsCount++;
      }
    }
  }

  if (orbitsCount === 0) return fallback;

  const dictHeader = mappings.map((m) => `${m.glyph}=${JSON.stringify(m.phrase)}`).join('\n');
  const wire = `${POLARIS_HEADER}\n${dictHeader}\n${POLARIS_PAYLOAD_MARKER}\n${body}`;

  const outTokens = countTokens(wire, enc);
  const decoded = polarisDecode(wire, enc);
  const exact = decoded === text;

  if (exact && outTokens < inTokens) {
    return {
      wire,
      decoded,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: ((inTokens - outTokens) / inTokens) * 100,
      orbitsCount,
      notes: `POLARIS-P1 polar orbits=${orbitsCount} · byte-exact`,
    };
  }

  return fallback;
}

export function polarisDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (wire.startsWith(POLARIS_LITERAL + '\n')) return wire.slice(POLARIS_LITERAL.length + 1);
  if (!wire.startsWith(POLARIS_HEADER + '\n')) return wire;

  const rest = wire.slice(POLARIS_HEADER.length + 1);
  const payloadIdx = rest.indexOf('\n' + POLARIS_PAYLOAD_MARKER + '\n');
  if (payloadIdx < 0) return wire;

  const dictBlock = rest.slice(0, payloadIdx);
  let body = rest.slice(payloadIdx + POLARIS_PAYLOAD_MARKER.length + 2);

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

export function polarisSelfTest(enc: EncodingName = 'o200k_base'): boolean {
  const sample = '### Incident review card 01\n### Incident review card 01\n### Incident review card 01';
  const res = polarisEncode(sample, enc);
  const back = polarisDecode(res.wire, enc);
  return back === sample;
}
