/**
 * src/lib/omega/astral.ts
 * =============================================================================
 * OMEGA-A1 "ASTRAL" — TOPOLOGICAL GRAMMATICAL QUOTIENT CONTRACTION (ASTRAL-A1)
 *
 * PARADIGM SHIFT: Zero-Overhead Grammatical Quotient Transposition
 *  - Models natural syntax and structured text as topological quotient maps.
 *  - Discovers equivalence relations over repeated substring orbits and assigns
 *    single-token topological projection markers from a version-stable CJK pool.
 *  - Guarantees 100% byte-exact lossless recovery without requiring CoT output token
 *    decompression billing or local binary state.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { ideographPool } from './strata';

export interface AstralEntry {
  symbol: string;
  quotient: string;
  occurrences: number;
}

export interface AstralResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  entries: AstralEntry[];
  mode: 'astral' | 'identity' | 'fallback';
  notes: string;
}

const ASTRAL_HEADER = '§ASTRAL-A1§';
const ASTRAL_DIVIDER = '⟿';

function findQuotientCandidates(text: string, enc: EncodingName): string[] {
  const sample = text.length > 200_000 ? text.slice(0, 200_000) : text;
  const matches = sample.match(/[A-Za-z0-9_.$:/-]+|[^A-Za-z0-9_\s]+|\s+/g) ?? [];
  const seen = new Set<string>();
  const candidates: { phrase: string; score: number }[] = [];

  const evaluate = (phrase: string) => {
    const trimmed = phrase.trimEnd();
    if (trimmed.length < 6 || trimmed.length > 200 || trimmed.includes('\n')) return;
    if (seen.has(trimmed)) return;
    seen.add(trimmed);

    let count = 0;
    let pos = 0;
    while ((pos = sample.indexOf(trimmed, pos)) !== -1) {
      count++;
      pos += trimmed.length;
    }
    if (count < 2) return;

    const tokLen = countTokens(trimmed, enc);
    const gain = (tokLen - 1) * count - tokLen - 3;
    if (gain > 0) {
      candidates.push({ phrase: trimmed, score: gain });
    }
  };

  for (let window = 8; window >= 1; window--) {
    for (let i = 0; i + window <= matches.length; i++) {
      let sub = '';
      for (let w = 0; w < window; w++) sub += matches[i + w];
      evaluate(sub);
    }
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, 160).map((c) => c.phrase);
}

function assembleAstralWire(entries: AstralEntry[], body: string): string {
  if (entries.length === 0) return body;
  const legend = entries.map((e) => `${e.symbol}=${e.quotient}`).join('\n');
  return `${ASTRAL_HEADER}\n${legend}\n${ASTRAL_DIVIDER}\n${body}`;
}

export function astralDecode(wire: string): string {
  if (!wire.startsWith(ASTRAL_HEADER)) return wire;
  const firstNl = wire.indexOf('\n');
  if (firstNl < 0) return wire;
  const divStr = '\n' + ASTRAL_DIVIDER + '\n';
  const divAt = wire.indexOf(divStr, firstNl + 1);
  if (divAt < 0) return wire;

  const legendLines = wire.slice(firstNl + 1, divAt).split('\n').filter(Boolean);
  let body = wire.slice(divAt + divStr.length);

  const mappings: { symbol: string; quotient: string }[] = [];
  for (const line of legendLines) {
    const eq = line.indexOf('=');
    if (eq <= 0) return wire;
    mappings.push({ symbol: line.slice(0, eq), quotient: line.slice(eq + 1) });
  }

  for (let i = mappings.length - 1; i >= 0; i--) {
    const { symbol, quotient } = mappings[i];
    body = body.split(symbol).join(quotient);
  }

  return body;
}

export function astralEncode(text: string, enc: EncodingName = 'o200k_base'): AstralResult {
  const inTokens = countTokens(text, enc);
  const fallback = (notes: string): AstralResult => ({
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

  if (!text || inTokens < 10) return fallback('input too short for topological quotient map');

  const pool = ideographPool(enc).filter((ch) => !text.includes(ch));
  if (pool.length < 2) return fallback('insufficient free single-token topological symbols');

  let body = text;
  const entries: AstralEntry[] = [];
  let bestWire = text;
  let bestTokens = inTokens;

  const candidates = findQuotientCandidates(text, enc);
  for (const phrase of candidates) {
    if (entries.length >= 60 || entries.length >= pool.length) break;

    let hits = 0;
    let pos = 0;
    while ((pos = body.indexOf(phrase, pos)) !== -1) {
      hits++;
      pos += phrase.length;
    }
    if (hits < 2) continue;

    const symbol = pool[entries.length];
    const nextBody = body.split(phrase).join(symbol);
    const nextEntries = [...entries, { symbol, quotient: phrase, occurrences: hits }];
    const testWire = assembleAstralWire(nextEntries, nextBody);
    const testTok = countTokens(testWire, enc);

    if (testTok >= bestTokens) continue;

    body = nextBody;
    entries.push({ symbol, quotient: phrase, occurrences: hits });
    bestWire = testWire;
    bestTokens = testTok;
  }

  if (entries.length === 0) return fallback('no positive-gain quotient maps discovered');

  const decoded = astralDecode(bestWire);
  if (decoded !== text) return fallback('guard: ASTRAL roundtrip verification failed');

  return {
    wire: bestWire,
    decoded,
    exact: true,
    inTokens,
    outTokens: bestTokens,
    savingsPct: inTokens ? ((inTokens - bestTokens) / inTokens) * 100 : 0,
    entries,
    mode: 'astral',
    notes: `${entries.length} topological quotient projections · byte-exact`,
  };
}

export function astralSelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
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
      const res = astralEncode(tc.text, enc);
      const dec = astralDecode(res.wire);
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

export const ASTRAL_SYSTEM_PROMPT = [
  'A leading `§ASTRAL-A1§` header contains a topological quotient dictionary mapping projection symbols to substrings.',
  'Reconstruction expands projection symbols in reverse order below the `⟿` divider line.',
  'Reconstruction is 100% byte-exact and deterministic.',
].join('\n');
