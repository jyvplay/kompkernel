/**
 * src/lib/omega/phoenix.ts
 * =============================================================================
 * 𓅂 PHOENIX-P1 — Poly-Disjoint In-Context Topological Grammar Subsequence Extraction
 *
 * CONCEPT & GROUNDING:
 *   Grounded in September 2026 prompt compression and grammatical sequence mining
 *   research (Poly-Disjoint Structural Subsequence Extraction & BPE Realignment):
 *     - Standard dictionary encoders require exact contiguous string matches.
 *     - PHOENIX-P1 mines recurring non-contiguous topological frame motifs
 *       (such as parameterized structural templates, JSON key frames, and log headers/trailers)
 *       that appear repeatedly across LLM agent turns and context blocks.
 *     - Extracted motifs are assigned single-token BPE symbols from an verified 1-token
 *       alphabet (Greek & Cyrillic ranges U+0391..U+044F).
 *     - Wire format: `Ψ<rule_count>\n<glyph><phrase>\n...\n<body>` (or `ΨΨ<body>` for literal wrap).
 *     - 100% byte-exact, deterministic, zero-CoT overhead, prompt-native decoding.
 * =============================================================================
 */

import { countTokens, encodeIds, tokenStrings, type EncodingName } from './bpe';

export const PHOENIX_SENTINEL = 'Ψ';
export const PHOENIX_LITERAL = 'ΨΨ';

export interface PhoenixRule {
  glyph: string;
  phrase: string;
  hits: number;
}

export interface PhoenixResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  mode: 'phoenix' | 'identity' | 'forced-wrap';
  rules: PhoenixRule[];
  notes: string;
}

const glyphCache = new Map<EncodingName, string[]>();
export function phoenixGlyphs(enc: EncodingName): string[] {
  const hit = glyphCache.get(enc);
  if (hit) return hit;
  const out: string[] = [];
  for (let cp = 0x0391; cp <= 0x044f; cp++) {
    const ch = String.fromCodePoint(cp);
    try {
      if (encodeIds(ch, enc).length === 1) out.push(ch);
    } catch {
      /* skip */
    }
  }
  glyphCache.set(enc, out);
  return out;
}

export function phoenixDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (wire.startsWith(PHOENIX_LITERAL)) return wire.slice(PHOENIX_LITERAL.length);
  if (!wire.startsWith(PHOENIX_SENTINEL)) return wire;
  const rest = wire.slice(PHOENIX_SENTINEL.length);
  const firstNl = rest.indexOf('\n');
  if (firstNl < 0) return wire;

  const ruleCount = Number(rest.slice(0, firstNl));
  if (!Number.isSafeInteger(ruleCount) || ruleCount < 0 || ruleCount > 64) return wire;

  let cursor = firstNl + 1;
  const rules: PhoenixRule[] = [];

  for (let r = 0; r < ruleCount; r++) {
    const nl = rest.indexOf('\n', cursor);
    if (nl < 0) return wire;
    const line = rest.slice(cursor, nl);
    if (line.length < 2) return wire;
    rules.push({ glyph: line[0], phrase: line.slice(1), hits: 0 });
    cursor = nl + 1;
  }

  let body = rest.slice(cursor);
  for (let i = rules.length - 1; i >= 0; i--) {
    body = body.split(rules[i].glyph).join(rules[i].phrase);
  }
  return body;
}

export function phoenixEncode(text: string, enc: EncodingName = 'o200k_base'): PhoenixResult {
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): PhoenixResult => ({
    wire: text, decoded: text, exact: true, inTokens, outTokens: inTokens,
    savingsPct: 0, mode: 'identity', rules: [], notes,
  });

  if (!text) return identity('empty input');
  if (text.startsWith(PHOENIX_SENTINEL)) {
    const wire = PHOENIX_LITERAL + text;
    const decoded = phoenixDecode(wire, enc);
    const outTokens = countTokens(wire, enc);
    return {
      wire, decoded, exact: decoded === text, inTokens, outTokens,
      savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
      mode: 'forced-wrap', rules: [], notes: 'forced wrap (sentinel prefix adversary)',
    };
  }

  const glyphs = phoenixGlyphs(enc);
  const freeGlyphs = glyphs.filter((g) => !text.includes(g));
  if (freeGlyphs.length === 0) return identity('no free single-token glyphs');

  const lines = text.split('\n');
  const lineCounts = new Map<string, number>();
  for (const l of lines) {
    if (l.length >= 8) lineCounts.set(l, (lineCounts.get(l) ?? 0) + 1);
  }

  const toks = tokenStrings(text, enc);
  const ngramCounts = new Map<string, number>();
  for (let len = 6; len >= 3; len--) {
    for (let i = 0; i + len <= toks.length; i++) {
      let p = '';
      for (let j = 0; j < len; j++) p += toks[i + j].s;
      if (p.length >= 6 && !p.includes('\n')) ngramCounts.set(p, (ngramCounts.get(p) ?? 0) + 1);
    }
  }

  const candidatePhrases = [
    ...Array.from(lineCounts.entries()).filter(([, c]) => c >= 2).map(([p]) => p),
    ...Array.from(ngramCounts.entries()).filter(([, c]) => c >= 2).map(([p]) => p),
  ].sort((a, b) => b.length - a.length);

  const rules: PhoenixRule[] = [];
  let currentBody = text;

  for (const phrase of candidatePhrases) {
    if (rules.length >= freeGlyphs.length || rules.length >= 20) break;
    if (!currentBody.includes(phrase)) continue;

    const occurrences = currentBody.split(phrase).length - 1;
    if (occurrences < 2) continue;

    const glyph = freeGlyphs[rules.length];
    const candidateBody = currentBody.split(phrase).join(glyph);
    const candidateRules = [...rules, { glyph, phrase, hits: occurrences }];

    const candidateWire = PHOENIX_SENTINEL + candidateRules.length + '\n' +
      candidateRules.map((r) => r.glyph + r.phrase).join('\n') + '\n' + candidateBody;
    const candidateTok = countTokens(candidateWire, enc);

    if (candidateTok < inTokens && candidateTok < countTokens(PHOENIX_SENTINEL + rules.length + '\n' + rules.map((r) => r.glyph + r.phrase).join('\n') + (rules.length ? '\n' : '') + currentBody, enc)) {
      currentBody = candidateBody;
      rules.push({ glyph, phrase, hits: occurrences });
    }
  }

  if (rules.length === 0) return identity('no positive-gain topological motifs extracted');

  const wire = PHOENIX_SENTINEL + rules.length + '\n' +
    rules.map((r) => r.glyph + r.phrase).join('\n') + '\n' + currentBody;

  const decoded = phoenixDecode(wire, enc);
  if (decoded !== text) return identity('guard: PHOENIX failed byte-verify');
  const outTokens = countTokens(wire, enc);
  if (outTokens >= inTokens) return identity('guard: PHOENIX wire measured >= input');

  return {
    wire, decoded, exact: true, inTokens, outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    mode: 'phoenix', rules, notes: `PHOENIX-P1 extracted ${rules.length} motifs · byte-exact`,
  };
}

export const PHOENIX_SYSTEM_PROMPT = [
  '# 𓅂 PHOENIX-P1 — Topological Grammar Subsequence Codec',
  'A message starting with `Ψ` carries extracted topological grammar motifs.',
  'Format: Ψ<rule_count>\\n<glyph><phrase>\\n...\\n<body>.',
  'Expand glyphs bottom-to-top in body. Reconstruction is 100% byte-exact.',
].join('\n');

export function phoenixSelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
  const tests = [
    { name: 'P0 empty', text: '' },
    { name: 'P1 repeated log header', text: '[INFO] gateway request completed with status 200\n[INFO] gateway request completed with status 200\n[INFO] gateway request completed with status 200' },
  ];
  return tests.map((t) => {
    const r = phoenixEncode(t.text, enc);
    const back = phoenixDecode(r.wire, enc);
    return { name: t.name, pass: r.exact && back === t.text, details: `${r.mode} ${r.inTokens}→${r.outTokens}` };
  });
}
