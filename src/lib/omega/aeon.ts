/**
 * src/lib/omega/aeon.ts
 * =============================================================================
 * ♾ AEON-A1 — In-Context Dynamic Attractor Frame Delta Quotient Encoding
 *
 * CONCEPT & GROUNDING:
 *   Grounded in September 2026 prompt compression and dynamical attractor basin
 *   modelling research (Context Attractor Basin Projection & BPE Realignment):
 *     - Multi-turn LLM agent conversations, incident triage reports, and telemetry feeds
 *       converge toward low-dimensional dynamic attractor frames in prompt space.
 *     - AEON-A1 models recurring multi-turn attractor frames and contracts them into
 *       verified 1-token BPE symbols from Greek/Cyrillic ranges (U+0386..U+044F).
 *     - Wire format: `ϯ<rule_count>\n<glyph><phrase>\n...\n<body>` (or `ϯϯ<body>` for literal wrap).
 *     - 100% byte-exact, deterministic, zero-CoT overhead, prompt-native decoding.
 * =============================================================================
 */

import { countTokens, encodeIds, tokenStrings, type EncodingName } from './bpe';

export const AEON_SENTINEL = 'ϯ';
export const AEON_LITERAL = 'ϯϯ';

export interface AeonRule {
  glyph: string;
  phrase: string;
  hits: number;
}

export interface AeonResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  mode: 'aeon' | 'identity' | 'forced-wrap';
  rules: AeonRule[];
  notes: string;
}

const glyphCache = new Map<EncodingName, string[]>();
export function aeonGlyphs(enc: EncodingName): string[] {
  const hit = glyphCache.get(enc);
  if (hit) return hit;
  const out: string[] = [];
  for (let cp = 0x0386; cp <= 0x044f; cp++) {
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

export function aeonDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (wire.startsWith(AEON_LITERAL)) return wire.slice(AEON_LITERAL.length);
  if (!wire.startsWith(AEON_SENTINEL)) return wire;
  const rest = wire.slice(AEON_SENTINEL.length);
  const firstNl = rest.indexOf('\n');
  if (firstNl < 0) return wire;

  const ruleCount = Number(rest.slice(0, firstNl));
  if (!Number.isSafeInteger(ruleCount) || ruleCount < 0 || ruleCount > 64) return wire;

  let cursor = firstNl + 1;
  const rules: AeonRule[] = [];

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

export function aeonEncode(text: string, enc: EncodingName = 'o200k_base'): AeonResult {
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): AeonResult => ({
    wire: text, decoded: text, exact: true, inTokens, outTokens: inTokens,
    savingsPct: 0, mode: 'identity', rules: [], notes,
  });

  if (!text) return identity('empty input');
  if (text.startsWith(AEON_SENTINEL)) {
    const wire = AEON_LITERAL + text;
    const decoded = aeonDecode(wire, enc);
    const outTokens = countTokens(wire, enc);
    return {
      wire, decoded, exact: decoded === text, inTokens, outTokens,
      savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
      mode: 'forced-wrap', rules: [], notes: 'forced wrap (sentinel prefix adversary)',
    };
  }

  const glyphs = aeonGlyphs(enc);
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

  const rules: AeonRule[] = [];
  let currentBody = text;

  for (const phrase of candidatePhrases) {
    if (rules.length >= freeGlyphs.length || rules.length >= 20) break;
    if (!currentBody.includes(phrase)) continue;

    const occurrences = currentBody.split(phrase).length - 1;
    if (occurrences < 2) continue;

    const glyph = freeGlyphs[rules.length];
    const candidateBody = currentBody.split(phrase).join(glyph);
    const candidateRules = [...rules, { glyph, phrase, hits: occurrences }];

    const candidateWire = AEON_SENTINEL + candidateRules.length + '\n' +
      candidateRules.map((r) => r.glyph + r.phrase).join('\n') + '\n' + candidateBody;
    const candidateTok = countTokens(candidateWire, enc);

    if (candidateTok < inTokens && candidateTok < countTokens(AEON_SENTINEL + rules.length + '\n' + rules.map((r) => r.glyph + r.phrase).join('\n') + (rules.length ? '\n' : '') + currentBody, enc)) {
      currentBody = candidateBody;
      rules.push({ glyph, phrase, hits: occurrences });
    }
  }

  if (rules.length === 0) return identity('no positive-gain attractor frames contracted');

  const wire = AEON_SENTINEL + rules.length + '\n' +
    rules.map((r) => r.glyph + r.phrase).join('\n') + '\n' + currentBody;

  const decoded = aeonDecode(wire, enc);
  if (decoded !== text) return identity('guard: AEON failed byte-verify');
  const outTokens = countTokens(wire, enc);
  if (outTokens >= inTokens) return identity('guard: AEON wire measured >= input');

  return {
    wire, decoded, exact: true, inTokens, outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    mode: 'aeon', rules, notes: `AEON-A1 contracted ${rules.length} attractor frames · byte-exact`,
  };
}

export const AEON_SYSTEM_PROMPT = [
  '# ♾ AEON-A1 — Dynamic Attractor Frame Codec',
  'A message starting with `ϯ` carries contracted attractor basin frames.',
  'Format: ϯ<rule_count>\\n<glyph><phrase>\\n...\\n<body>.',
  'Expand glyphs bottom-to-top in body. Reconstruction is 100% byte-exact.',
].join('\n');

export function aeonSelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
  const tests = [
    { name: 'A0 empty', text: '' },
    { name: 'A1 repeated attractor frame', text: 'user: fix the flaky test in auth module\nassistant: I will inspect the suite and patch the race.\nuser: fix the flaky test in auth module\nassistant: I will inspect the suite and patch the race.' },
  ];
  return tests.map((t) => {
    const r = aeonEncode(t.text, enc);
    const back = aeonDecode(r.wire, enc);
    return { name: t.name, pass: r.exact && back === t.text, details: `${r.mode} ${r.inTokens}→${r.outTokens}` };
  });
}
