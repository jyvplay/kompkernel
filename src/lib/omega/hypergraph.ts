/**
 * src/lib/omega/hypergraph.ts
 * =============================================================================
 * 🕸 HYPERGRAPH-H2 — In-Context Directed Hypergraph Non-Contiguous Grammar Factorization
 *
 * CONCEPT & GROUNDING:
 *   Grounded in September 2026 prompt compression and hypergraph grammar factorization research:
 *     - Structural prompt patterns (JSON schemas, log headers/footers, SQL query blocks,
 *       and multi-agent turn cards) form directed hypergraphs where hyperedges span
 *       non-contiguous multi-node token sequences.
 *     - HYPERGRAPH-H2 extracts non-contiguous hyperedge motifs (e.g., repeating line structures
 *       with multiple variable slot nodes), contracts them onto single-token Greek/Cyrillic
 *       sentinels from a verified 1-token BPE pool (U+0386..U+044F), and transmits:
 *           `[H2]\n<hyperedge_symbol>=<hyperedge_template>\n---\n<node_assignments>`
 *     - Wire format: `[H2]\n<hyperedges>\n---\n<body>` (or `[H2-LIT]\n<body>` for wrap).
 *     - 100% byte-exact, deterministic, zero-CoT overhead, prompt-native decoding.
 * =============================================================================
 */

import { countTokens, encodeIds, type EncodingName } from './bpe';

export const HYPERGRAPH_SENTINEL = '[H2]\n';
export const HYPERGRAPH_LITERAL = '[H2-LIT]\n';
export const HYPERGRAPH_DIVIDER = '\n---\n';

export interface HypergraphRule {
  symbol: string;
  template: string;
  count: number;
}

export interface HypergraphResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  applied: boolean;
  rules: HypergraphRule[];
  notes: string;
  encodeMs: number;
}

const poolCache = new Map<EncodingName, string[]>();

export function hypergraphPool(enc: EncodingName): string[] {
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

const SLOT_GLYPHS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];

function extractHyperedgeMotif(lines: string[]): { template: string; hypernodes: string[][] } | null {
  if (lines.length < 2) return null;
  const first = lines[0];
  if (first.length < 10) return null;

  const parts = first.split(/([A-Za-z0-9_.-]+)/);
  if (parts.length < 3) return null;

  const slotIndices: number[] = [];
  for (let i = 0; i < parts.length; i++) {
    const val = parts[i];
    if (val.length > 0 && /^[A-Za-z0-9_.-]+$/.test(val)) {
      let varies = false;
      for (let l = 1; l < lines.length; l++) {
        if (!lines[l].includes(parts[i - 1] ?? '') || !lines[l].includes(parts[i + 1] ?? '')) {
          return null; // structural hyperedge mismatch
        }
        if (lines[l] !== first) {
          const lineParts = lines[l].split(/([A-Za-z0-9_.-]+)/);
          if (lineParts.length === parts.length && lineParts[i] !== val) {
            varies = true;
          }
        }
      }
      if (varies) {
        slotIndices.push(i);
      }
    }
  }

  if (slotIndices.length === 0 || slotIndices.length > 8) return null;

  const templateParts = [...parts];
  for (let sIdx = 0; sIdx < slotIndices.length; sIdx++) {
    const idx = slotIndices[sIdx];
    templateParts[idx] = SLOT_GLYPHS[sIdx];
  }
  const template = templateParts.join('');

  const hypernodes: string[][] = Array.from({ length: lines.length }, () => []);

  const regexStr = '^' + templateParts.map((p) => {
    if (SLOT_GLYPHS.includes(p)) return '(.*?)';
    return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('') + '$';

  let re: RegExp;
  try {
    re = new RegExp(regexStr);
  } catch {
    return null;
  }

  for (let l = 0; l < lines.length; l++) {
    const match = re.exec(lines[l]);
    if (!match) return null;
    for (let s = 0; s < slotIndices.length; s++) {
      hypernodes[l].push(match[s + 1]);
    }
  }

  return { template, hypernodes };
}

export function hypergraphEncode(text: string, enc: EncodingName = 'o200k_base'): HypergraphResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
  const inTokens = countTokens(text, enc);

  const identity = (notes: string): HypergraphResult => ({
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
  if (text.startsWith(HYPERGRAPH_SENTINEL)) {
    const wire = HYPERGRAPH_LITERAL + text.slice(HYPERGRAPH_SENTINEL.length);
    const decoded = hypergraphDecode(wire, enc);
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

  const lines = text.split('\n');
  if (lines.length < 2) return identity('input too short for hypergraph motif extraction');

  const pool = hypergraphPool(enc);
  const freeSymbols = pool.filter((s) => !text.includes(s));
  if (freeSymbols.length < 2) return identity('insufficient free single-token symbols');

  const motif = extractHyperedgeMotif(lines);
  if (!motif) return identity('no non-contiguous hypergraph motif found');

  const symbol = freeSymbols[0];
  const rules: HypergraphRule[] = [
    { symbol, template: motif.template, count: lines.length },
  ];

  const hypernodeRows = motif.hypernodes.map((row) => row.join('\t')).join('\n');
  const wire = `${HYPERGRAPH_SENTINEL}${symbol}=${motif.template}${HYPERGRAPH_DIVIDER}${hypernodeRows}`;

  const decoded = hypergraphDecode(wire, enc);
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
    notes: `HYPERGRAPH-H2 non-contiguous hyperedge contracted for ${lines.length} lines · byte-exact`,
    encodeMs: ms(),
  };
}

export function hypergraphDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (wire.startsWith(HYPERGRAPH_LITERAL)) {
    return HYPERGRAPH_SENTINEL + wire.slice(HYPERGRAPH_LITERAL.length);
  }
  if (!wire.startsWith(HYPERGRAPH_SENTINEL)) return wire;

  const rest = wire.slice(HYPERGRAPH_SENTINEL.length);
  const divIdx = rest.indexOf(HYPERGRAPH_DIVIDER);
  if (divIdx < 0) return wire;

  const header = rest.slice(0, divIdx);
  const body = rest.slice(divIdx + HYPERGRAPH_DIVIDER.length);

  const eqIdx = header.indexOf('=');
  if (eqIdx !== 1) return wire;

  const symbol = header[0];
  const template = header.slice(2);
  const hypernodeLines = body.split('\n');

  const reconstructedLines: string[] = [];
  for (const line of hypernodeLines) {
    const nodeVals = line.split('\t');
    let t = template;
    for (let s = 0; s < nodeVals.length; s++) {
      if (s < SLOT_GLYPHS.length) {
        t = t.replace(SLOT_GLYPHS[s], () => nodeVals[s]);
      }
    }
    reconstructedLines.push(t);
  }

  return reconstructedLines.join('\n');
}

export function hypergraphDecoderPrompt(): string {
  return [
    '# 🕸 HYPERGRAPH-H2 — In-Context Directed Hypergraph Non-Contiguous Grammar Factorization',
    'A HYPERGRAPH wire starts with `[H2]`, followed by hyperedge template mappings (`<symbol>=<template>`),',
    'a divider `\n---\n`, and tab-separated hypernode slot assignments.',
    'To decode:',
    '1. If wire starts with `[H2-LIT]`, strip `[H2-LIT]` and prepend `[H2]`.',
    '2. Otherwise, substitute each line\'s tab-separated hypernode values into template placeholders ①..⑧ in order.',
    '3. Rejoin reconstructed lines with newlines.',
    'Reconstruction is 100% byte-exact.',
  ].join('\n');
}

export const HYPERGRAPH_SYSTEM_PROMPT = hypergraphDecoderPrompt();

export function hypergraphSelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
  const out: { name: string; pass: boolean; details: string }[] = [];

  const sample = Array.from({ length: 16 }, (_, i) =>
    `HYPERGRAPH_NODE [2026-09-18T12:00:${String(i).padStart(2, '0')}Z] cluster_name=us_east_1_edge_gateway status=${200 + (i % 2) * 300} latency_ms=${10 + i * 15} transaction_hash=tx_${i * 987654321}`
  ).join('\n');

  const r = hypergraphEncode(sample, enc);
  out.push({
    name: 'H2 Hypergraph non-contiguous motif roundtrip & savings',
    pass: r.exact && hypergraphDecode(r.wire, enc) === sample && r.applied && r.outTokens < r.inTokens,
    details: `${r.inTokens} -> ${r.outTokens} (${r.savingsPct.toFixed(1)}%)`,
  });

  const wrapped = HYPERGRAPH_SENTINEL + 'literal test';
  const rWrap = hypergraphEncode(wrapped, enc);
  out.push({
    name: 'H2 forced literal wrap',
    pass: hypergraphDecode(rWrap.wire, enc) === wrapped,
    details: `wire=${rWrap.wire}`,
  });

  return out;
}
