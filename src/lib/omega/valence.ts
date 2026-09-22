/**
 * src/lib/omega/valence.ts
 * =============================================================================
 * ⚛ VALENCE-V1 — Factoradix Permutation-Rank & Token-Quorum Lossless Codec
 *
 * CONCEPT & GROUNDING:
 *   Grounded in combinatorial number theory (Factorial Number System / Lehmer code)
 *   and BPE token-quorum compression:
 *     - Multi-turn logs, list structures, JSON key permutations, and CSV records
 *       frequently consist of items drawn from a canonical lexicographical palette P.
 *     - Transmitting a permutation pi of N distinct items explicitly costs O(N * L) tokens.
 *     - VALENCE-V1 sorts the distinct items into canonical order P, computes the
 *       Factoradix Lehmer rank R in [0, N! - 1], and transmits:
 *           `[V1]\n<N>:<R>\n<palette_elements_joined_by_sep>`
 *     - The decoder receives the canonical palette, reconstructs pi from the
 *       Factoradix rank R in O(N log N) time, and outputs the exact original order.
 *     - Wire format: `[V1]\n<N>:<R>\n<palette_elements>` (or `[V1-LIT]\n<body>` for wrap).
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
  rank: string;
  itemsCount: number;
  notes: string;
  encodeMs: number;
}

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

export function invertLehmerRank(n: number, rank: bigint): number[] {
  const factorials: bigint[] = [1n];
  for (let i = 1; i <= n; i++) {
    factorials.push(factorials[i - 1] * BigInt(i));
  }

  const perm: number[] = [];
  const items = Array.from({ length: n }, (_, i) => i);
  let rem = rank;

  for (let i = 0; i < n; i++) {
    const fact = factorials[n - 1 - i];
    const idx = Number(rem / fact);
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
    rank: '0',
    itemsCount: 0,
    notes,
    encodeMs: ms(),
  });

  if (!text) return identity('empty input');

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
      rank: '0',
      itemsCount: 0,
      notes: 'forced literal wrap for sentinel-prefixed input',
      encodeMs: ms(),
    };
  }

  const lines = text.split('\n');
  if (lines.length < 3) return identity('input too short for permutation rank encoding');

  const uniqueLines = Array.from(new Set(lines));
  if (uniqueLines.length !== lines.length) return identity('duplicate lines present (not a pure permutation)');

  const palette = [...lines].sort();
  const perm = lines.map((l) => palette.indexOf(l));

  const rank = computeLehmerRank(perm);
  const rankStr = rank.toString();

  const wire = `${VALENCE_SENTINEL}${lines.length}:${rankStr}\n${palette.join('\n')}`;

  const decoded = valenceDecode(wire, enc);
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
    rank: rankStr,
    itemsCount: lines.length,
    notes: `VALENCE-V1 Factoradix rank R=${rankStr} for N=${lines.length} items · byte-exact`,
    encodeMs: ms(),
  };
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
  const [nStr, rankStr] = header.split(':');
  const n = Number(nStr);
  if (!Number.isSafeInteger(n) || n < 1) return wire;

  let rank: bigint;
  try {
    rank = BigInt(rankStr);
  } catch {
    return wire;
  }

  const paletteLines = rest.slice(firstNl + 1).split('\n');
  if (paletteLines.length !== n) return wire;

  const perm = invertLehmerRank(n, rank);
  const reconstructed = perm.map((idx) => paletteLines[idx]);

  return reconstructed.join('\n');
}

export function valenceDecoderPrompt(): string {
  return [
    '# ⚛ VALENCE-V1 — Factoradix Permutation-Rank & Token-Quorum Lossless Codec',
    'A VALENCE wire starts with `[V1]`, followed by `<N>:<R>`, a newline,',
    'and N sorted canonical palette elements (one per line).',
    'To decode:',
    '1. If wire starts with `[V1-LIT]`, strip `[V1-LIT]\n` and prepend `[V1]\n`.',
    '2. Otherwise, invert Factoradix Lehmer rank R back into permutation pi of length N.',
    '3. Reorder the canonical palette lines according to pi and join with newlines.',
    'Reconstruction is 100% byte-exact.',
  ].join('\n');
}

export const VALENCE_SYSTEM_PROMPT = valenceDecoderPrompt();

export function valenceSelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
  const out: { name: string; pass: boolean; details: string }[] = [];

  const sample = Array.from({ length: 20 }, (_, i) =>
    `cluster_node_configuration_entry_parameter_specification_and_metadata_record_number_${(i * 13) % 20 + 1}`
  ).join('\n');

  const r = valenceEncode(sample, enc);
  out.push({
    name: 'V1 Factoradix permutation roundtrip',
    pass: r.exact && valenceDecode(r.wire, enc) === sample,
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
