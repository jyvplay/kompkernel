/**
 * src/lib/omega/valence.ts
 * =============================================================================
 * ⚛ VALENCE-V1 — Factoradix Permutation-Rank & Token-Quorum Lossless Codec
 *
 * CONCEPT & GROUNDING:
 *   Grounded in combinatorial number theory (Factorial Number System / Lehmer code)
 *   and BPE token-quorum compression:
 *     - Multi-turn logs, list structures, JSON key permutations, and CSV records
 *       frequently consist of M records sharing the same N distinct fields in varying order.
 *     - Transmitting M permuted rows explicitly costs O(M * N * L) tokens.
 *     - VALENCE-V1 extracts the canonical sorted palette P of N distinct fields,
 *       computes the Factoradix Lehmer rank R_k in [0, N! - 1] for each record k,
 *       and transmits the palette ONCE followed by the rank vector:
 *           `[V1]\n<N>:<R_1>,<R_2>,...,<R_M>\n<palette_field_1>\n<palette_field_2>...`
 *     - The decoder receives the canonical palette, reconstructs each row from its
 *       Factoradix rank in O(N log N) time, and outputs the exact original multi-row order.
 *     - Wire format: `[V1]\n<N>:<R_1>,<R_2>...\n<palette>` (or `[V1-LIT]\n<body>` for wrap).
 *     - 100% byte-exact, deterministic, zero-CoT overhead, prompt-native decoding.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';

export const VALENCE_SENTINEL = '[V1]\n';
export const VALENCE_LITERAL = '[V1-LIT]\n';

export interface ValenceResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  applied: boolean;
  ranks: string[];
  itemsCount: number;
  notes: string;
  encodeMs: number;
}

/** Compute Lehmer code / Factoradix rank R of a permutation pi of distinct items. */
export function computeLehmerRank(perm: number[]): bigint {
  const n = perm.length;
  let rank = 0n;
  const factorials: bigint[] = [1n];
  for (let i = 1; i <= n; i++) {
    factorials.push(factorials[i - 1] * BigInt(i));
  }

  const seen = new Array<boolean>(n).fill(false);
  for (let i = 0; i < n; i++) {
    const val = perm[i];
    let count = 0n;
    for (let j = 0; j < val; j++) {
      if (!seen[j]) count++;
    }
    seen[val] = true;
    rank += count * factorials[n - 1 - i];
  }
  return rank;
}

/** Uncompute Factoradix rank R back into the permutation pi of length N. Safe bounds check included. */
export function invertLehmerRank(n: number, rank: bigint): number[] {
  const factorials: bigint[] = [1n];
  for (let i = 1; i <= n; i++) {
    factorials.push(factorials[i - 1] * BigInt(i));
  }

  const identityPerm = Array.from({ length: n }, (_, i) => i);
  if (n < 1 || rank < 0n || rank >= factorials[n]) {
    return identityPerm;
  }

  const perm: number[] = [];
  const items = [...identityPerm];
  let rem = rank;

  for (let i = 0; i < n; i++) {
    const fact = factorials[n - 1 - i];
    const idx = Number(rem / fact);
    if (!Number.isSafeInteger(idx) || idx < 0 || idx >= items.length) {
      return identityPerm;
    }
    rem = rem % fact;
    perm.push(items[idx]);
    items.splice(idx, 1);
  }
  return perm;
}

export function valenceEncode(text: string, enc: EncodingName = 'o200k_base'): ValenceResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
  const inTokens = countTokens(text, enc);

  const identity = (notes: string): ValenceResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    applied: false,
    ranks: [],
    itemsCount: 0,
    notes,
    encodeMs: ms(),
  });

  if (!text) return identity('empty input');

  // G4: Forced wrap for sentinel-prefixed input
  if (text.startsWith(VALENCE_SENTINEL)) {
    const wire = VALENCE_LITERAL + text.slice(VALENCE_SENTINEL.length);
    const decoded = valenceDecode(wire, enc);
    const outTokens = countTokens(wire, enc);
    return {
      wire,
      decoded,
      exact: decoded === text,
      inTokens,
      outTokens,
      savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
      applied: false,
      ranks: [],
      itemsCount: 0,
      notes: 'forced literal wrap for sentinel-prefixed input',
      encodeMs: ms(),
    };
  }

  const lines = text.split('\n');
  if (lines.length < 2) return identity('input too short for multi-row Factoradix permutation rank encoding');

  // Detect delimiter (comma, pipe, or space) across lines
  for (const delim of [',', '|', ' ']) {
    const grid = lines.map((l) => l.split(delim));
    const n = grid[0].length;
    if (n < 3) continue;

    let validGrid = true;
    for (const row of grid) {
      if (row.length !== n) { validGrid = false; break; }
      if (new Set(row).size !== n) { validGrid = false; break; } // must be distinct items per row
    }
    if (!validGrid) continue;

    // Check that all rows share the same set of items
    const palette = [...grid[0]].sort();
    const sortedKey0 = palette.join('\u0000');

    let matchingPalette = true;
    const ranks: bigint[] = [];

    for (const row of grid) {
      const rowSorted = [...row].sort().join('\u0000');
      if (rowSorted !== sortedKey0) {
        matchingPalette = false;
        break;
      }
      const perm = row.map((item) => palette.indexOf(item));
      ranks.push(computeLehmerRank(perm));
    }

    if (!matchingPalette || ranks.length < 2) continue;

    const rankStrs = ranks.map((r) => r.toString());
    const header = `${n}:${delim}:${rankStrs.join(',')}`;
    const wire = `${VALENCE_SENTINEL}${header}\n${palette.join('\n')}`;

    const decoded = valenceDecode(wire, enc);
    if (decoded !== text) continue;

    const outTokens = countTokens(wire, enc);
    if (outTokens >= inTokens) continue;

    return {
      wire,
      decoded,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: ((inTokens - outTokens) / inTokens) * 100,
      applied: true,
      ranks: rankStrs,
      itemsCount: lines.length,
      notes: `VALENCE-V1 Factoradix palette ranks for ${lines.length} rows x ${n} fields · byte-exact`,
      encodeMs: ms(),
    };
  }

  return identity('no multi-row permuted palette structure found');
}

export function valenceDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (wire.startsWith(VALENCE_LITERAL)) {
    return VALENCE_SENTINEL + wire.slice(VALENCE_LITERAL.length);
  }
  if (!wire.startsWith(VALENCE_SENTINEL)) return wire;

  const rest = wire.slice(VALENCE_SENTINEL.length);
  const firstNl = rest.indexOf('\n');
  if (firstNl < 0) return wire;

  const header = rest.slice(0, firstNl);
  const colon1 = header.indexOf(':');
  if (colon1 < 0) return wire;
  const colon2 = header.indexOf(':', colon1 + 1);
  if (colon2 < 0) return wire;

  const n = Number(header.slice(0, colon1));
  const delim = header.slice(colon1 + 1, colon2);
  const rankStrs = header.slice(colon2 + 1).split(',');

  if (!Number.isSafeInteger(n) || n < 1 || !delim || rankStrs.length < 1) return wire;

  const paletteLines = rest.slice(firstNl + 1).split('\n');
  if (paletteLines.length !== n) return wire;

  const rows: string[] = [];
  for (const rankStr of rankStrs) {
    let rank: bigint;
    try {
      rank = BigInt(rankStr);
    } catch {
      return wire;
    }
    const perm = invertLehmerRank(n, rank);
    const rowItems = perm.map((idx) => paletteLines[idx]);
    rows.push(rowItems.join(delim));
  }

  return rows.join('\n');
}

export function valenceDecoderPrompt(): string {
  return [
    '# ⚛ VALENCE-V1 — Factoradix Permutation-Rank & Token-Quorum Lossless Codec',
    'A VALENCE wire starts with `[V1]`, followed by `<N>:<delim>:<R1,R2,...>`, a newline,',
    'and N sorted canonical palette elements (one per line).',
    'To decode:',
    '1. If wire starts with `[V1-LIT]`, strip `[V1-LIT]\n` and prepend `[V1]\n`.',
    '2. Otherwise, for each rank R_k in the header, invert Factoradix Lehmer rank R_k into permutation pi of length N.',
    '3. Reorder the palette elements according to pi, join with <delim>, and emit as row k.',
    '4. Join all reconstructed rows with newlines.',
    'Reconstruction is 100% byte-exact.',
  ].join('\n');
}

export const VALENCE_SYSTEM_PROMPT = valenceDecoderPrompt();

export function valenceSelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
  const out: { name: string; pass: boolean; details: string }[] = [];

  const sample = [
    'cluster_us_east_1,gateway_service_prod,healthy_status_ok,data_center_iad_3,node_capacity_100',
    'healthy_status_ok,node_capacity_100,gateway_service_prod,cluster_us_east_1,data_center_iad_3',
    'data_center_iad_3,cluster_us_east_1,node_capacity_100,healthy_status_ok,gateway_service_prod',
    'gateway_service_prod,data_center_iad_3,healthy_status_ok,node_capacity_100,cluster_us_east_1',
    'node_capacity_100,healthy_status_ok,cluster_us_east_1,gateway_service_prod,data_center_iad_3',
  ].join('\n');

  const r = valenceEncode(sample, enc);
  out.push({
    name: 'V1 Factoradix multi-row permutation roundtrip & savings',
    pass: r.exact && valenceDecode(r.wire, enc) === sample && r.applied && r.outTokens < r.inTokens,
    details: `${r.inTokens} -> ${r.outTokens} (${r.savingsPct.toFixed(1)}%)`,
  });

  const wrapped = VALENCE_SENTINEL + 'literal test';
  const rWrap = valenceEncode(wrapped, enc);
  out.push({
    name: 'V2 forced literal wrap',
    pass: valenceDecode(rWrap.wire, enc) === wrapped,
    details: `wire=${rWrap.wire}`,
  });

  return out;
}
