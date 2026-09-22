/**
 * src/lib/omega/astraea.ts
 * =============================================================================
 * 🌌 ASTRAEA-A2 — Adaptive Contextual Straight-Line Grammar Induction & BPE-Boundary Realignment
 *
 * CONCEPT & GROUNDING:
 *   Grounded in straight-line grammar induction theory (SLG / Re-Pair) and BPE
 *   token-boundary alignment:
 *     - LLM context inputs often contain multi-word instruction patterns,
 *       standardized markdown report headers, code blocks, and multi-token CJK idioms.
 *     - ASTRAEA-A2 scans the text for non-overlapping recurring sub-phrases,
 *       binds them to verified single-token Greek/Cyrillic symbols (U+0386..U+044F),
 *       and generates an exact straight-line grammar wire format:
 *           `[A2]\n<symbol_1>=<expansion_1>\n<symbol_2>=<expansion_2>\n---\n<compact_body>`
 *     - Wire format: `[A2]\n<grammar_rules>\n---\n<body>` (or `[A2-LIT]\n<body>` for wrap).
 *     - 100% byte-exact, deterministic, zero-CoT overhead, prompt-native decoding.
 * =============================================================================
 */

import { countTokens, encodeIds, type EncodingName } from './bpe';

export const ASTRAEA_SENTINEL = '[A2]\n';
export const ASTRAEA_LITERAL = '[A2-LIT]\n';
export const ASTRAEA_DIVIDER = '\n---\n';

export interface AstraeaRule {
  symbol: string;
  phrase: string;
  count: number;
}

export interface AstraeaResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  applied: boolean;
  rules: AstraeaRule[];
  notes: string;
  encodeMs: number;
}

const poolCache = new Map<EncodingName, string[]>();

export function astraeaPool(enc: EncodingName): string[] {
  const hit = poolCache.get(enc);
  if (hit) return hit;
  const out: string[] = [];
  const pushRange = (from: number, to: number) => {
    for (let cp = from; cp <= to && out.length < 512; cp++) {
      const ch = String.fromCodePoint(cp);
      try {
        if (encodeIds(ch, enc).length === 1 && ch !== '[') {
          out.push(ch);
        }
      } catch {
        /* skip */
      }
    }
  };
  pushRange(0x0386, 0x03ce); // Greek
  pushRange(0x0400, 0x044f); // Cyrillic
  poolCache.set(enc, out);
  return out;
}

function findFrequentSubphrases(text: string, enc: EncodingName): { phrase: string; count: number }[] {
  const minLen = 6;
  const maxLen = 120;
  const counts = new Map<string, number>();

  // Extract candidate phrases
  for (let len = minLen; len <= maxLen; len += 4) {
    for (let i = 0; i <= text.length - len; i += 2) {
      const sub = text.slice(i, i + len);
      if (sub.includes('\n') || sub.includes('=') || sub.includes('---')) continue;

      let count = 0;
      let pos = 0;
      while ((pos = text.indexOf(sub, pos)) !== -1) {
        count++;
        pos += sub.length; // Non-overlapping
      }
      if (count >= 2) {
        const tokenGain = (countTokens(sub, enc) - 1) * count - countTokens(sub, enc) - 3;
        if (tokenGain > 0) {
          counts.set(sub, count);
        }
      }
    }
  }

  const sorted = Array.from(counts.entries())
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => (b.phrase.length * b.count) - (a.phrase.length * a.count));

  return sorted.slice(0, 16);
}

export function astraeaEncode(text: string, enc: EncodingName = 'o200k_base'): AstraeaResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
  const inTokens = countTokens(text, enc);

  const identity = (notes: string): AstraeaResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    applied: false,
    rules: [],
    notes,
    encodeMs: ms(),
  });

  if (!text) return identity('empty input');

  // G4: Forced wrap for sentinel-prefixed input
  if (text.startsWith(ASTRAEA_SENTINEL)) {
    const wire = ASTRAEA_LITERAL + text.slice(ASTRAEA_SENTINEL.length);
    const decoded = astraeaDecode(wire, enc);
    const outTokens = countTokens(wire, enc);
    return {
      wire,
      decoded,
      exact: decoded === text,
      inTokens,
      outTokens,
      savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
      applied: false,
      rules: [],
      notes: 'forced literal wrap for sentinel-prefixed input',
      encodeMs: ms(),
    };
  }

  const pool = astraeaPool(enc);
  const freeSymbols = pool.filter((s) => !text.includes(s));
  if (freeSymbols.length < 2) return identity('insufficient free single-token symbols');

  const cands = findFrequentSubphrases(text, enc);
  if (cands.length === 0) return identity('no profitable straight-line grammar phrases found');

  let body = text;
  const rules: AstraeaRule[] = [];

  for (const cand of cands) {
    if (rules.length >= freeSymbols.length) break;
    if (!body.includes(cand.phrase)) continue;

    const symbol = freeSymbols[rules.length];
    body = body.split(cand.phrase).join(symbol);
    rules.push({ symbol, phrase: cand.phrase, count: cand.count });
  }

  if (rules.length === 0) return identity('no grammar rules applied');

  // Wire format: [A2]\n<symbol1>=<phrase1>\n...\n---\n<body>
  const ruleHeader = rules.map((r) => `${r.symbol}=${r.phrase}`).join('\n');
  const wire = `${ASTRAEA_SENTINEL}${ruleHeader}${ASTRAEA_DIVIDER}${body}`;

  const decoded = astraeaDecode(wire, enc);
  if (decoded !== text) return identity('G2 gate failed: decode divergence');

  const outTokens = countTokens(wire, enc);
  if (outTokens > inTokens) return identity(`G3 gate failed: wire token count (${outTokens}) > inTokens (${inTokens})`);

  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    applied: outTokens < inTokens,
    rules,
    notes: `ASTRAEA-A2 induced ${rules.length} straight-line grammar rules · byte-exact`,
    encodeMs: ms(),
  };
}

export function astraeaDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (wire.startsWith(ASTRAEA_LITERAL)) {
    return ASTRAEA_SENTINEL + wire.slice(ASTRAEA_LITERAL.length);
  }
  if (!wire.startsWith(ASTRAEA_SENTINEL)) return wire;

  const rest = wire.slice(ASTRAEA_SENTINEL.length);
  const divIdx = rest.indexOf(ASTRAEA_DIVIDER);
  if (divIdx < 0) return wire;

  const header = rest.slice(0, divIdx);
  let body = rest.slice(divIdx + ASTRAEA_DIVIDER.length);

  const ruleLines = header.split('\n');
  for (let i = ruleLines.length - 1; i >= 0; i--) {
    const line = ruleLines[i];
    const eqIdx = line.indexOf('=');
    if (eqIdx === 1) {
      const symbol = line[0];
      const phrase = line.slice(2);
      body = body.split(symbol).join(phrase);
    }
  }

  return body;
}

export function astraeaDecoderPrompt(): string {
  return [
    '# 🌌 ASTRAEA-A2 — Adaptive Contextual Straight-Line Grammar Induction & BPE-Boundary Realignment',
    'An ASTRAEA wire starts with `[A2]`, followed by grammar production rules (`<symbol>=<phrase>`),',
    'a divider `\n---\n`, and the compact body.',
    'To decode:',
    '1. If wire starts with `[A2-LIT]`, strip `[A2-LIT]` and prepend `[A2]`.',
    '2. Otherwise, substitute each rule\'s symbol in the body with its expansion phrase in reverse order.',
    'Reconstruction is 100% byte-exact.',
  ].join('\n');
}

export const ASTRAEA_SYSTEM_PROMPT = astraeaDecoderPrompt();

export function astraeaSelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
  const out: { name: string; pass: boolean; details: string }[] = [];

  const sample = Array.from({ length: 10 }, () =>
    'System status report: all microservices in region us-east-1 operating nominally without errors or warnings.'
  ).join('\n');

  const r = astraeaEncode(sample, enc);
  out.push({
    name: 'A1 Straight-Line Grammar Induction roundtrip & savings',
    pass: r.exact && astraeaDecode(r.wire, enc) === sample && r.applied && r.outTokens < r.inTokens,
    details: `${r.inTokens} -> ${r.outTokens} (${r.savingsPct.toFixed(1)}%)`,
  });

  const wrapped = ASTRAEA_SENTINEL + 'literal test';
  const rWrap = astraeaEncode(wrapped, enc);
  out.push({
    name: 'A2 forced literal wrap',
    pass: astraeaDecode(rWrap.wire, enc) === wrapped,
    details: `wire=${rWrap.wire}`,
  });

  return out;
}
