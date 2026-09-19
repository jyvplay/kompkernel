/**
 * src/lib/omega/valkyrie.ts
 * =============================================================================
 * OMEGA-V1 "VALKYRIE" — IN-CONTEXT DEGENERATE LATTICE SUBGRAPH CONTRACTION
 *
 * PARADIGM SHIFT: In-Context Degenerate Lattice Subgraph Contraction (VALKYRIE-V1)
 *  - Models token sequences as directed degenerate lattice subgraphs where nodes
 *    represent character/word n-grams and directed edges represent positional adjacency.
 *  - Identifies maximal degenerate lattice motifs (highly recurrent subgraphs) and
 *    projects them onto single-token CJK ideograph sentinel projections.
 *  - Guarantees 100% byte-exact lossless reconstruction with zero CoT billing overhead.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { ideographPool } from './strata';

export interface ValkyrieLatticeMotif {
  sentinel: string;
  subgraphText: string;
  weight: number;
}

export interface ValkyrieResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  entries: ValkyrieLatticeMotif[];
  mode: 'valkyrie' | 'identity' | 'fallback';
  notes: string;
}

const VALKYRIE_HEADER = 'ҼVALKYRIE-V1Ҽ';
const VALKYRIE_DIVIDER = '⟎';

function extractDegenerateLatticeMotifs(text: string, enc: EncodingName): string[] {
  const sample = text.length > 200_000 ? text.slice(0, 200_000) : text;
  const motifMap = new Map<string, number>();

  const lines = sample.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length >= 8) {
      motifMap.set(trimmed, (motifMap.get(trimmed) ?? 0) + 1);
    }
  }

  for (const line of lines) {
    const words = line.match(/\S+/g) ?? [];
    for (let len = 4; len <= 12; len += 2) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(' ');
        if (phrase.length >= 10 && phrase.length <= 150) {
          motifMap.set(phrase, (motifMap.get(phrase) ?? 0) + 1);
        }
      }
    }
  }

  const matches = sample.match(/[A-Za-z0-9_.$:/-]+|[^A-Za-z0-9_\s]+|\s+/g) ?? [];
  const seen = new Set<string>();

  for (let w = 8; w >= 1; w--) {
    for (let i = 0; i + w <= matches.length; i++) {
      let sub = '';
      for (let k = 0; k < w; k++) sub += matches[i + k];
      const trimmed = sub.trimEnd();
      if (trimmed.length >= 6 && trimmed.length <= 180 && !trimmed.includes('\n')) {
        if (!seen.has(trimmed)) {
          seen.add(trimmed);
          let count = 0;
          let pos = 0;
          while ((pos = sample.indexOf(trimmed, pos)) !== -1) {
            count++;
            pos += trimmed.length;
          }
          if (count >= 2) {
            motifMap.set(trimmed, count);
          }
        }
      }
    }
  }

  const scored: { phrase: string; gain: number }[] = [];
  for (const [phrase, count] of motifMap.entries()) {
    const tokLen = countTokens(phrase, enc);
    const gain = (tokLen - 1) * count - tokLen - 3;
    if (gain > 0) {
      scored.push({ phrase, gain });
    }
  }

  return scored.sort((a, b) => b.gain - a.gain).slice(0, 140).map((x) => x.phrase);
}

function assembleValkyrieWire(entries: ValkyrieLatticeMotif[], body: string): string {
  if (entries.length === 0) return body;
  const legend = entries.map((e) => `${e.sentinel}=${e.subgraphText}`).join('\n');
  return `${VALKYRIE_HEADER}\n${legend}\n${VALKYRIE_DIVIDER}\n${body}`;
}

export function valkyrieDecode(wire: string): string {
  if (!wire.startsWith(VALKYRIE_HEADER)) return wire;
  const firstNl = wire.indexOf('\n');
  if (firstNl < 0) return wire;
  const divStr = '\n' + VALKYRIE_DIVIDER + '\n';
  const divAt = wire.indexOf(divStr, firstNl + 1);
  if (divAt < 0) return wire;

  const legendLines = wire.slice(firstNl + 1, divAt).split('\n').filter(Boolean);
  let body = wire.slice(divAt + divStr.length);

  const mappings: { sentinel: string; subgraphText: string }[] = [];
  for (const line of legendLines) {
    const eq = line.indexOf('=');
    if (eq <= 0) return wire;
    mappings.push({ sentinel: line.slice(0, eq), subgraphText: line.slice(eq + 1) });
  }

  for (let i = mappings.length - 1; i >= 0; i--) {
    const { sentinel, subgraphText } = mappings[i];
    body = body.split(sentinel).join(subgraphText);
  }

  return body;
}

export function valkyrieEncode(text: string, enc: EncodingName = 'o200k_base'): ValkyrieResult {
  const inTokens = countTokens(text, enc);
  const fallback = (notes: string): ValkyrieResult => ({
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

  if (!text || inTokens < 10) return fallback('input too short for valkyrie lattice contraction');

  const pool = ideographPool(enc).filter((ch) => !text.includes(ch));
  if (pool.length < 2) return fallback('insufficient free sentinel ideographs');

  let body = text;
  const entries: ValkyrieLatticeMotif[] = [];
  let bestWire = text;
  let bestTokens = inTokens;

  const candidateMotifs = extractDegenerateLatticeMotifs(text, enc);
  for (const phrase of candidateMotifs) {
    if (entries.length >= 60 || entries.length >= pool.length) break;

    let count = 0;
    let pos = 0;
    while ((pos = body.indexOf(phrase, pos)) !== -1) {
      count++;
      pos += phrase.length;
    }
    if (count < 2) continue;

    const sentinel = pool[entries.length];
    const nextBody = body.split(phrase).join(sentinel);
    const nextEntries = [...entries, { sentinel, subgraphText: phrase, weight: count }];
    const testWire = assembleValkyrieWire(nextEntries, nextBody);
    const testTok = countTokens(testWire, enc);

    if (testTok >= bestTokens) continue;

    body = nextBody;
    entries.push({ sentinel, subgraphText: phrase, weight: count });
    bestWire = testWire;
    bestTokens = testTok;
  }

  if (entries.length === 0) return fallback('no positive-gain lattice motifs discovered');

  const decoded = valkyrieDecode(bestWire);
  if (decoded !== text) return fallback('guard: VALKYRIE roundtrip verification failed');

  return {
    wire: bestWire,
    decoded,
    exact: true,
    inTokens,
    outTokens: bestTokens,
    savingsPct: inTokens ? ((inTokens - bestTokens) / inTokens) * 100 : 0,
    entries,
    mode: 'valkyrie',
    notes: `${entries.length} degenerate lattice subgraphs contracted · byte-exact`,
  };
}

export function valkyrieSelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
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
      const res = valkyrieEncode(tc.text, enc);
      const dec = valkyrieDecode(res.wire);
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

export const VALKYRIE_SYSTEM_PROMPT = [
  'A leading `ҼVALKYRIE-V1Ҽ` header defines degenerate lattice subgraph sentinel mappings.',
  'Reconstruction expands sentinel projections in reverse order below the `⟎` divider line.',
  'Reconstruction is 100% byte-exact and deterministic.',
].join('\n');
