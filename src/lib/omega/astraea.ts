/**
 * src/lib/omega/astraea.ts
 * =============================================================================
 * 🌌 ASTRAEA-A2 — Adaptive Contextual Straight-Line Grammar Induction
 *                 & BPE-Boundary Realignment Codec
 *
 * CONCEPT & GROUNDING:
 *   Grounded in September 2026 prompt compression research (Lossless Straight-Line
 *   Grammar Induction, Grammatical Subsequence Contraction, and BPE Realignment):
 *     - Multi-turn LLM contexts, logs, and structured prompt outputs frequently contain
 *       repeating multi-token collocations, structured schema fields, and idioms.
 *     - ASTRAEA-A2 induces a minimal Straight-Line Program (SLP) grammar over recurring
 *       character/token n-grams and substitutes them using a single-token Greek &
 *       Cyrillic symbol alphabet (U+0386..U+044F), which are verified 1-token BPE glyphs.
 *     - Wire format: `Α<rule_count>\n<glyph><phrase>\n...\n<body>` (or `ΑΑ<body>` for literal wrap).
 *     - 100% byte-exact, deterministic, zero-CoT overhead, prompt-native decoding.
 * =============================================================================
 */

import { countTokens, encodeIds, type EncodingName } from './bpe';

export const ASTRAEA_SENTINEL = 'Α';
export const ASTRAEA_LITERAL = 'ΑΑ';

export interface AstraeaRule {
  glyph: string;
  phrase: string;
  hits: number;
}

export interface AstraeaResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  mode: 'astraea' | 'identity' | 'forced-wrap';
  rules: AstraeaRule[];
  notes: string;
}

/** Single-token Greek & Cyrillic glyph pool verified in BPE space. */
const glyphCache = new Map<EncodingName, string[]>();
export function astraeaGlyphs(enc: EncodingName): string[] {
  const hit = glyphCache.get(enc);
  if (hit) return hit;
  const out: string[] = [];
  for (let cp = 0x0386; cp <= 0x044f; cp++) {
    const ch = String.fromCodePoint(cp);
    try {
      if (encodeIds(ch, enc).length === 1) out.push(ch);
    } catch {
      /* skip invalid code points */
    }
  }
  glyphCache.set(enc, out);
  return out;
}

export function astraeaDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (wire.startsWith(ASTRAEA_LITERAL)) return wire.slice(ASTRAEA_LITERAL.length);
  if (!wire.startsWith(ASTRAEA_SENTINEL)) return wire;
  const rest = wire.slice(ASTRAEA_SENTINEL.length);
  const firstNl = rest.indexOf('\n');
  if (firstNl < 0) return wire;

  const countStr = rest.slice(0, firstNl);
  const ruleCount = Number(countStr);
  if (!Number.isSafeInteger(ruleCount) || ruleCount < 0 || ruleCount > 64) return wire;

  let cursor = firstNl + 1;
  const rules: AstraeaRule[] = [];

  for (let r = 0; r < ruleCount; r++) {
    const nl = rest.indexOf('\n', cursor);
    if (nl < 0) return wire;
    const line = rest.slice(cursor, nl);
    if (line.length < 2) return wire;
    const glyph = line[0];
    const phrase = line.slice(1);
    rules.push({ glyph, phrase, hits: 0 });
    cursor = nl + 1;
  }

  let body = rest.slice(cursor);
  for (let i = rules.length - 1; i >= 0; i--) {
    body = body.split(rules[i].glyph).join(rules[i].phrase);
  }
  return body;
}

export function astraeaEncode(text: string, enc: EncodingName = 'o200k_base'): AstraeaResult {
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): AstraeaResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    mode: 'identity',
    rules: [],
    notes,
  });

  if (!text) return identity('empty input');

  if (text.startsWith(ASTRAEA_SENTINEL)) {
    const wire = ASTRAEA_LITERAL + text;
    const decoded = astraeaDecode(wire, enc);
    const outTokens = countTokens(wire, enc);
    return {
      wire,
      decoded,
      exact: decoded === text,
      inTokens,
      outTokens,
      savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
      mode: 'forced-wrap',
      rules: [],
      notes: 'forced wrap (sentinel prefix adversary)',
    };
  }

  const glyphs = astraeaGlyphs(enc);
  const freeGlyphs = glyphs.filter((g) => !text.includes(g));
  if (freeGlyphs.length === 0) return identity('no free single-token glyphs');

  /* Mine frequent collocations/ngrams */
  const matches = Array.from(text.matchAll(/[A-Za-z0-9_.$:/-]{4,}|[^A-Za-z0-9_\s]{2,}/g));
  const counts = new Map<string, number>();
  for (const m of matches) {
    const phrase = m[0];
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }

  const rules: AstraeaRule[] = [];
  let currentBody = text;

  const candidatePhrases = Array.from(counts.entries())
    .filter(([p, count]) => count >= 2 && countTokens(p, enc) >= 2 && !p.includes('\n'))
    .sort((a, b) => b[0].length * b[1] - a[0].length * a[1]);

  for (const [phrase, count] of candidatePhrases) {
    if (rules.length >= freeGlyphs.length || rules.length >= 16) break;
    const glyph = freeGlyphs[rules.length];
    const candidateBody = currentBody.split(phrase).join(glyph);
    const candidateRules = [...rules, { glyph, phrase, hits: count }];

    const candidateWire = ASTRAEA_SENTINEL + candidateRules.length + '\n' +
      candidateRules.map((r) => r.glyph + r.phrase).join('\n') + '\n' + candidateBody;
    const candidateTok = countTokens(candidateWire, enc);

    if (candidateTok < countTokens(ASTRAEA_SENTINEL + rules.length + '\n' + rules.map((r) => r.glyph + r.phrase).join('\n') + (rules.length ? '\n' : '') + currentBody, enc) && candidateTok < inTokens) {
      currentBody = candidateBody;
      rules.push({ glyph, phrase, hits: count });
    }
  }

  if (rules.length === 0) return identity('no positive-gain grammar rules induced');

  const wire = ASTRAEA_SENTINEL + rules.length + '\n' +
    rules.map((r) => r.glyph + r.phrase).join('\n') + '\n' + currentBody;

  const decoded = astraeaDecode(wire, enc);
  if (decoded !== text) return identity('guard: ASTRAEA failed byte-verify');
  const outTokens = countTokens(wire, enc);
  if (outTokens >= inTokens) return identity('guard: ASTRAEA wire measured >= input');

  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    mode: 'astraea',
    rules,
    notes: `ASTRAEA-A2 induced ${rules.length} grammar rules · byte-exact`,
  };
}

export const ASTRAEA_SYSTEM_PROMPT = [
  '# 🌌 ASTRAEA-A2 — Adaptive Contextual Straight-Line Grammar Codec',
  'A message starting with `Α` indicates a straight-line grammar contracted wire.',
  'Format: Α<rule_count>\\n<glyph><phrase>\\n...\\n<body>.',
  'Expand glyphs bottom-to-top in the body. Reconstruction is byte-exact.',
].join('\n');

export function astraeaSelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
  const tests = [
    { name: 'A0 empty', text: '' },
    { name: 'A1 simple repeat', text: 'user: run step 1 and verify the status ok\nuser: run step 2 and verify the status ok\nuser: run step 3 and verify the status ok\nuser: run step 4 and verify the status ok' },
    { name: 'A2 sentinel adversary', text: 'ΑΑnot a wire' },
  ];
  return tests.map((t) => {
    const r = astraeaEncode(t.text, enc);
    const back = astraeaDecode(r.wire, enc);
    return {
      name: t.name,
      pass: r.exact && back === t.text && (t.text === '' || r.outTokens <= r.inTokens),
      details: `${r.mode} ${r.inTokens}→${r.outTokens} rules=${r.rules.length}`,
    };
  });
}
