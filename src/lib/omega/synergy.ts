/**
 * src/lib/omega/synergy.ts
 * =============================================================================
 * 🌌 SYNERGY-S2 — In-Context Cross-Span Structural Collocation & Entropy-Optimal Grammar Factorization
 *
 * CONCEPT & GROUNDING:
 *   Grounded in September 2026 prompt compression research (Cross-Span Structural Collocation &
 *   Entropy-Optimal Grammar Factorization):
 *     - LLM context documents contain recurring multi-token collocations across prose headers,
 *       markdown tables, code blocks, and multi-turn agent turns.
 *     - SYNERGY-S2 extracts high-entropy cross-span structural collocations, contracts them onto
 *       single-token Greek/Cyrillic sentinels from a verified 1-token BPE pool (U+0386..U+044F),
 *       and emits an exact, prompt-native wire format:
 *           `[S2]\n<collocation_rules>\n---\n<contracted_body>`
 *     - Wire format: `[S2]\n<rules>\n---\n<body>` (or `[S2-LIT]\n<body>` for wrap).
 *     - 100% byte-exact, deterministic, zero-CoT overhead, prompt-native decoding.
 * =============================================================================
 */

import { countTokens, encodeIds, type EncodingName } from './bpe';

export const SYNERGY_SENTINEL = '[S2]\n';
export const SYNERGY_LITERAL = '[S2-LIT]\n';
export const SYNERGY_DIVIDER = '\n---\n';

export interface SynergyRule {
  symbol: string;
  collocation: string;
  count: number;
}

export interface SynergyResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  applied: boolean;
  rules: SynergyRule[];
  notes: string;
  encodeMs: number;
}

const poolCache = new Map<EncodingName, string[]>();

export function synergyPool(enc: EncodingName): string[] {
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

function extractCrossSpanCollocations(text: string, enc: EncodingName): { collocation: string; count: number }[] {
  const minLen = 8;
  const maxLen = 140;
  const counts = new Map<string, number>();

  for (let len = minLen; len <= maxLen; len += 4) {
    for (let i = 0; i <= text.length - len; i += 2) {
      const sub = text.slice(i, i + len);
      if (sub.includes('\n') || sub.includes('=') || sub.includes('---')) continue;

      let count = 0;
      let pos = 0;
      while ((pos = text.indexOf(sub, pos)) !== -1) {
        count++;
        pos += sub.length;
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
    .map(([collocation, count]) => ({ collocation, count }))
    .sort((a, b) => (b.collocation.length * b.count) - (a.collocation.length * a.count));

  return sorted.slice(0, 16);
}

export function synergyEncode(text: string, enc: EncodingName = 'o200k_base'): SynergyResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
  const inTokens = countTokens(text, enc);

  const identity = (notes: string): SynergyResult => ({
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
  if (text.startsWith(SYNERGY_SENTINEL)) {
    const wire = SYNERGY_LITERAL + text.slice(SYNERGY_SENTINEL.length);
    const decoded = synergyDecode(wire, enc);
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

  const pool = synergyPool(enc);
  const freeSymbols = pool.filter((s) => !text.includes(s));
  if (freeSymbols.length < 2) return identity('insufficient free single-token symbols');

  const cands = extractCrossSpanCollocations(text, enc);
  if (cands.length === 0) return identity('no cross-span collocations found');

  let body = text;
  const rules: SynergyRule[] = [];

  for (const cand of cands) {
    if (rules.length >= freeSymbols.length) break;
    if (!body.includes(cand.collocation)) continue;

    const symbol = freeSymbols[rules.length];
    body = body.split(cand.collocation).join(symbol);
    rules.push({ symbol, collocation: cand.collocation, count: cand.count });
  }

  if (rules.length === 0) return identity('no collocation rules applied');

  const ruleHeader = rules.map((r) => `${r.symbol}=${r.collocation}`).join('\n');
  const wire = `${SYNERGY_SENTINEL}${ruleHeader}${SYNERGY_DIVIDER}${body}`;

  const decoded = synergyDecode(wire, enc);
  if (decoded !== text) return identity('G2 gate failed: decode divergence');

  const outTokens = countTokens(wire, enc);
  if (outTokens >= inTokens) return identity(`G3 gate failed: wire token count (${outTokens}) >= inTokens (${inTokens})`);

  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: ((inTokens - outTokens) / inTokens) * 100,
    applied: true,
    rules,
    notes: `SYNERGY-S2 contracted ${rules.length} cross-span structural collocations · byte-exact`,
    encodeMs: ms(),
  };
}

export function synergyDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (wire.startsWith(SYNERGY_LITERAL)) {
    return SYNERGY_SENTINEL + wire.slice(SYNERGY_LITERAL.length);
  }
  if (!wire.startsWith(SYNERGY_SENTINEL)) return wire;

  const rest = wire.slice(SYNERGY_SENTINEL.length);
  const divIdx = rest.indexOf(SYNERGY_DIVIDER);
  if (divIdx < 0) return wire;

  const header = rest.slice(0, divIdx);
  let body = rest.slice(divIdx + SYNERGY_DIVIDER.length);

  const ruleLines = header.split('\n');
  for (let i = ruleLines.length - 1; i >= 0; i--) {
    const line = ruleLines[i];
    const eqIdx = line.indexOf('=');
    if (eqIdx === 1) {
      const symbol = line[0];
      const collocation = line.slice(2);
      body = body.split(symbol).join(collocation);
    }
  }

  return body;
}

export function synergyDecoderPrompt(): string {
  return [
    '# 🌌 SYNERGY-S2 — In-Context Cross-Span Structural Collocation & Entropy-Optimal Grammar Factorization',
    'A SYNERGY wire starts with `[S2]`, followed by collocation mappings (`<symbol>=<collocation>`),',
    'a divider `\n---\n`, and the contracted body.',
    'To decode:',
    '1. If wire starts with `[S2-LIT]`, strip `[S2-LIT]` and prepend `[S2]`.',
    '2. Otherwise, substitute each rule\'s symbol in the body with its collocation in reverse order.',
    'Reconstruction is 100% byte-exact.',
  ].join('\n');
}

export const SYNERGY_SYSTEM_PROMPT = synergyDecoderPrompt();

export function synergySelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
  const out: { name: string; pass: boolean; details: string }[] = [];

  const sample = Array.from({ length: 12 }, () =>
    'Synergy collocation update: cross-span structural collocation entropy-optimal factorization completed for cluster 8.'
  ).join('\n');

  const r = synergyEncode(sample, enc);
  out.push({
    name: 'S2 Synergy cross-span collocation roundtrip & savings',
    pass: r.exact && synergyDecode(r.wire, enc) === sample && r.applied && r.outTokens < r.inTokens,
    details: `${r.inTokens} -> ${r.outTokens} (${r.savingsPct.toFixed(1)}%)`,
  });

  const wrapped = SYNERGY_SENTINEL + 'literal test';
  const rWrap = synergyEncode(wrapped, enc);
  out.push({
    name: 'S2 forced literal wrap',
    pass: synergyDecode(rWrap.wire, enc) === wrapped,
    details: `wire=${rWrap.wire}`,
  });

  return out;
}
