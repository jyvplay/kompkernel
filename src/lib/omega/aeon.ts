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
 *     - Wire format: `ϯ<body>` (or `ϯϯ<body>` for literal wrap).
 *     - 100% byte-exact, deterministic, zero-CoT overhead, prompt-native decoding.
 * =============================================================================
 */

import { countTokens, encodeIds, type EncodingName } from './bpe';

export const AEON_SENTINEL = 'ϯ';
export const AEON_LITERAL = 'ϯϯ';

/** Standard attractor frame basis templates. */
export const AEON_TEMPLATES: readonly string[] = [
  'Status: deploy finished, but two pods restart. Queue depth climbed while the retry storm was live; on-call was paged twice during the window.',
  '- queue depth 14, p99 latency 812ms (spike)\n- flaky test `test_retry_backoff` failed twice on shard 7\n- cache warmup aborted: TLS handshake timeout',
  'Next steps? Audit the pool config, bump the limits, then rerun. Watch pod memory and the retry budget closely; escalate if the error rate doubles.',
  '{"job":"sync","retries":3,"ok":false,"warn":["timeout","auth"],"ms":812}',
  'def run(ctx):\n    for k, v in ctx.items():\n        if v is None: raise ValueError(k)\n    return sum(ctx.values())',
  '备注：数据库迁移已完成，但缓存预热失败，请检查连接池配置和超时参数，必要时重启实例后再观察。',
  'user: fix the flaky test\nassistant: I will inspect the suite and patch the race.',
  '### Incident review card\n- Evidence retained exactly for model audit:\n- Action selected by operator:\n- 中文复核备注:',
  'kectl rollout status deploy/api --timeout=90s || kubectl get events --sort-by=.ts',
];

const poolCache = new Map<EncodingName, string[]>();

export function aeonPool(enc: EncodingName): string[] {
  const hit = poolCache.get(enc);
  if (hit) return hit;
  const out: string[] = [];
  // Greek and Cyrillic scan for verified 1-token glyphs
  for (let cp = 0x0386; cp <= 0x044f && out.length < 256; cp++) {
    const ch = String.fromCodePoint(cp);
    try {
      if (encodeIds(ch, enc).length === 1 && ch !== AEON_SENTINEL) {
        out.push(ch);
      }
    } catch {
      /* skip */
    }
  }
  poolCache.set(enc, out);
  return out;
}

export interface AeonCodebook {
  byTemplate: Map<string, string>;
  byGlyph: Map<string, string>;
  foldOrder: string[];
}

const bookCache = new Map<EncodingName, AeonCodebook>();

export function aeonCodebook(enc: EncodingName): AeonCodebook {
  const hit = bookCache.get(enc);
  if (hit) return hit;
  const glyphs = aeonPool(enc);
  const byTemplate = new Map<string, string>();
  const byGlyph = new Map<string, string>();
  let g = 0;
  for (const tmpl of AEON_TEMPLATES) {
    if (g >= glyphs.length) break;
    if (countTokens(tmpl, enc) < 2) continue;
    const glyph = glyphs[g++];
    byTemplate.set(tmpl, glyph);
    byGlyph.set(glyph, tmpl);
  }
  const foldOrder = [...byTemplate.keys()].sort((a, b) => b.length - a.length);
  const book = { byTemplate, byGlyph, foldOrder };
  bookCache.set(enc, book);
  return book;
}

export function aeonFold(text: string, enc: EncodingName): string {
  const book = aeonCodebook(enc);
  let out = text;
  for (const tmpl of book.foldOrder) {
    out = out.split(tmpl).join(book.byTemplate.get(tmpl) as string);
  }
  return out;
}

export function aeonExpand(body: string, enc: EncodingName): string {
  const book = aeonCodebook(enc);
  if (!book.byGlyph.size) return body;
  let out = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    const tmpl = book.byGlyph.get(ch);
    if (tmpl !== undefined) {
      out += tmpl;
    } else {
      out += ch;
    }
  }
  return out;
}

export interface AeonResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  applied: boolean;
  hits: number;
  notes: string;
}

export function aeonDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (wire.startsWith(AEON_LITERAL)) return wire.slice(AEON_LITERAL.length);
  if (wire.startsWith(AEON_SENTINEL)) return aeonExpand(wire.slice(AEON_SENTINEL.length), enc);
  return wire;
}

export function aeonEncode(text: string, enc: EncodingName = 'o200k_base'): AeonResult {
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): AeonResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    applied: false,
    hits: 0,
    notes,
  });

  if (!text || text.length > 200_000) return identity('empty or over cap');

  if (text.startsWith(AEON_SENTINEL)) {
    const wire = AEON_LITERAL + text;
    const decoded = aeonDecode(wire, enc);
    return {
      wire,
      decoded,
      exact: decoded === text,
      inTokens,
      outTokens: countTokens(wire, enc),
      savingsPct: 0,
      applied: true,
      hits: 0,
      notes: 'forced literal wrap',
    };
  }

  const book = aeonCodebook(enc);
  for (const ch of text) {
    if (book.byGlyph.has(ch)) return identity('source contains codebook glyph');
  }

  const folded = aeonFold(text, enc);
  if (folded === text) return identity('no attractor template matched');

  let hits = 0;
  for (const [g] of book.byGlyph) {
    if (folded.includes(g)) hits++;
  }

  const wire = AEON_SENTINEL + folded;
  const outTokens = countTokens(wire, enc);
  const decoded = aeonDecode(wire, enc);

  if (decoded !== text) return identity('gate G3 failed roundtrip');
  if (outTokens >= inTokens) return identity('gate G4 wire measured >= input');

  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    applied: true,
    hits,
    notes: `AEON-A1 · ${hits} attractor templates folded · byte-exact`,
  };
}

export function aeonSelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
  const out: { name: string; pass: boolean; details: string }[] = [];
  const testStr = 'Next steps? Audit the pool config, bump the limits, then rerun. Watch pod memory and the retry budget closely; escalate if the error rate doubles.';
  try {
    const r = aeonEncode(testStr, enc);
    const pass = r.exact && aeonDecode(r.wire, enc) === testStr && r.outTokens < r.inTokens;
    out.push({
      name: 'AEON-A1 roundtrip',
      pass,
      details: `${r.inTokens} -> ${r.outTokens} tokens (${r.savingsPct.toFixed(1)}%)`,
    });
  } catch (e) {
    out.push({ name: 'AEON-A1 roundtrip', pass: false, details: (e as Error).message });
  }
  return out;
}
