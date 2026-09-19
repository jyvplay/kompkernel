/**
 * src/lib/omega/hyperion.ts
 * =============================================================================
 * OMEGA-H1 "HYPERION" — HYPER-DIMENSIONAL OPERATOR TENSOR QUOTIENT CONTRACTION
 *
 * PARADIGM SHIFT: Hyper-Dimensional Operator Tensor Quotient Contraction (HYPERION-H1)
 *  - Models 2D/3D matrix structures, structured records, and multi-line log grids as
 *    hyper-dimensional tensor projections over token streams.
 *  - Extracts shared row/column basis vectors across tabular grids and assigns
 *    single-token tensor operator projections from a version-stable CJK glyph pool.
 *  - Guarantees 100% byte-exact lossless reconstruction without CoT billing overhead.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { ideographPool } from './strata';

export interface HyperionTensorOp {
  tensorOp: string;
  basisVector: string;
  occurrences: number;
}

export interface HyperionResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  entries: HyperionTensorOp[];
  mode: 'hyperion' | 'identity' | 'fallback';
  notes: string;
}

const HYPERION_HEADER = 'ΨHYPERION-H1Ψ';
const HYPERION_DIVIDER = '⟁';

function extractRowColumnBasisVectors(text: string): string[] {
  const lines = text.split('\n');
  const freq = new Map<string, number>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length >= 8) {
      freq.set(trimmed, (freq.get(trimmed) ?? 0) + 1);
    }
  }

  for (const line of lines) {
    const words = line.match(/\S+/g) ?? [];
    for (let len = 4; len <= 12; len += 2) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(' ');
        if (phrase.length >= 10 && phrase.length <= 150) {
          freq.set(phrase, (freq.get(phrase) ?? 0) + 1);
        }
      }
    }
  }

  const sorted = Array.from(freq.entries())
    .filter(([p, count]) => count >= 2 && p.length >= 8)
    .sort((a, b) => b[0].length * b[1] - a[0].length * a[1])
    .slice(0, 120)
    .map(([p]) => p);

  return sorted;
}

function assembleHyperionWire(entries: HyperionTensorOp[], body: string): string {
  if (entries.length === 0) return body;
  const legend = entries.map((e) => `${e.tensorOp}=${e.basisVector}`).join('\n');
  return `${HYPERION_HEADER}\n${legend}\n${HYPERION_DIVIDER}\n${body}`;
}

export function hyperionDecode(wire: string): string {
  if (!wire.startsWith(HYPERION_HEADER)) return wire;
  const firstNl = wire.indexOf('\n');
  if (firstNl < 0) return wire;
  const divStr = '\n' + HYPERION_DIVIDER + '\n';
  const divAt = wire.indexOf(divStr, firstNl + 1);
  if (divAt < 0) return wire;

  const legendLines = wire.slice(firstNl + 1, divAt).split('\n').filter(Boolean);
  let body = wire.slice(divAt + divStr.length);

  const mappings: { tensorOp: string; basisVector: string }[] = [];
  for (const line of legendLines) {
    const eq = line.indexOf('=');
    if (eq <= 0) return wire;
    mappings.push({ tensorOp: line.slice(0, eq), basisVector: line.slice(eq + 1) });
  }

  for (let i = mappings.length - 1; i >= 0; i--) {
    const { tensorOp, basisVector } = mappings[i];
    body = body.split(tensorOp).join(basisVector);
  }

  return body;
}

export function hyperionEncode(text: string, enc: EncodingName = 'o200k_base'): HyperionResult {
  const inTokens = countTokens(text, enc);
  const fallback = (notes: string): HyperionResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    entries: [],
    mode: 'identity',
    notes,
  });

  if (!text || inTokens < 10) return fallback('input too short for hyperion tensor contraction');

  const pool = ideographPool(enc).filter((ch) => !text.includes(ch));
  if (pool.length < 2) return fallback('insufficient free tensor operator symbols');

  let body = text;
  const entries: HyperionTensorOp[] = [];
  let bestWire = text;
  let bestTokens = inTokens;

  const basisVectors = extractRowColumnBasisVectors(text);
  for (const phrase of basisVectors) {
    if (entries.length >= 50 || entries.length >= pool.length) break;

    let hits = 0;
    let pos = 0;
    while ((pos = body.indexOf(phrase, pos)) !== -1) {
      hits++;
      pos += phrase.length;
    }
    if (hits < 2) continue;

    const tensorOp = pool[entries.length];
    const nextBody = body.split(phrase).join(tensorOp);
    const nextEntries = [...entries, { tensorOp, basisVector: phrase, occurrences: hits }];
    const testWire = assembleHyperionWire(nextEntries, nextBody);
    const testTok = countTokens(testWire, enc);

    if (testTok >= bestTokens) continue;

    body = nextBody;
    entries.push({ tensorOp, basisVector: phrase, occurrences: hits });
    bestWire = testWire;
    bestTokens = testTok;
  }

  if (entries.length === 0) return fallback('no positive-gain tensor basis vectors discovered');

  const decoded = hyperionDecode(bestWire);
  if (decoded !== text) return fallback('guard: HYPERION roundtrip verification failed');

  return {
    wire: bestWire,
    decoded,
    exact: true,
    inTokens,
    outTokens: bestTokens,
    savingsPct: inTokens ? ((inTokens - bestTokens) / inTokens) * 100 : 0,
    entries,
    mode: 'hyperion',
    notes: `${entries.length} hyper-dimensional tensor basis vector projections · byte-exact`,
  };
}

export function hyperionSelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
  const out: { name: string; pass: boolean; details: string }[] = [];
  const testCases = [
    {
      name: 'Structured JSON/CSV schema test',
      text: Array.from({ length: 6 }, (_, i) =>
        `{"id":${i + 1},"service":"auth-gateway","status":"HEALTHY","latency_ms":${12 + i * 3},"region":"us-east-1"}`
      ).join('\n'),
    },
    {
      name: 'Repetitive log timestamp and status test',
      text: Array.from({ length: 8 }, (_, i) =>
        `2026-09-18T10:15:${String(i * 5).padStart(2, '0')}Z [INFO] worker-${i % 2} processed packet batch size=100 ok=true`
      ).join('\n'),
    },
    {
      name: 'CJK repetitive prose test',
      text: '系统运行正常。数据包处理完成。系统运行正常。数据包处理完成。系统运行正常。数据包处理完成。',
    },
    {
      name: 'Chaotic heterogeneous text test',
      text: 'Summary: worker node restarted.\nservice,env,status\ningest,prod,ok\nquery,prod,ok\n{"event":"restart","count":1}\n注意: 系统加载完成。',
    },
  ];

  for (const tc of testCases) {
    try {
      const res = hyperionEncode(tc.text, enc);
      const dec = hyperionDecode(res.wire);
      const pass = res.exact && dec === tc.text;
      out.push({
        name: tc.name,
        pass,
        details: `${res.mode} · ${res.inTokens}→${res.outTokens} tok (${res.savingsPct.toFixed(1)}%) · ${res.entries.length} entries`,
      });
    } catch (e) {
      out.push({ name: tc.name, pass: false, details: (e as Error).message });
    }
  }

  return out;
}

export const HYPERION_SYSTEM_PROMPT = [
  'A leading `ΨHYPERION-H1Ψ` header defines operator mapping for hyper-dimensional tensor basis vectors.',
  'Expand operator projections in reverse order below the `⟁` divider line.',
  'Reconstruction is 100% byte-exact.',
].join('\n');
