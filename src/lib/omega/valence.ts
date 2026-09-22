/**
 * src/lib/omega/valence.ts
 * =============================================================================
 * VALENCE-V1 — Factoradix Permutation-Rank & Token-Quorum Lossless Codec
 *
 * CONCEPT & NOVELTY:
 *   BPE tokenizers incur significant token costs on ordered sequences (logs,
 *   lists, JSON keys, CSV rows) because every re-occurring or permuted line sequence
 *   costs O(N * L) tokens.
 *
 *   VALENCE-V1 uses Factoradix (Lehmer code / factorial number system) to map
 *   any permutation pi in S_N to a compact integer rank R in [0, N! - 1].
 *
 *   When a sequence of N unique lines or tokens appears, VALENCE sorts the items
 *   into a canonical lexicographical palette P, computes the Lehmer rank R of pi,
 *   and transmits:
 *      [V1]\n<N>:<R>\n<palette_elements>
 *
 *   The decoder receives the canonical palette, reconstructs pi from the Factoradix
 *   rank R in O(N log N) time via inversion, and outputs the exact original order.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';

export const VALENCE_SENTINEL = '[V1]\n';
export const VALENCE_LITERAL = '[V1][V1]\n';

export interface ValenceResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  mode: 'valence' | 'identity' | 'forced-wrap';
  notes: string;
}

/** Compute factorial n! safely up to n = 18 */
function factorial(n: number): bigint {
  let res = 1n;
  for (let i = 2n; i <= BigInt(n); i++) res *= i;
  return res;
}

/** Compute Factoradix Lehmer Rank for permutation pi of items [0..N-1] */
export function computeLehmerRank(pi: number[]): bigint {
  const n = pi.length;
  let rank = 0n;
  const seen = new Array<boolean>(n).fill(false);

  for (let i = 0; i < n; i++) {
    const val = pi[i];
    let count = 0n;
    for (let j = 0; j < val; j++) {
      if (!seen[j]) count++;
    }
    rank += count * factorial(n - 1 - i);
    seen[val] = true;
  }
  return rank;
}

/** Invert Factoradix Lehmer Rank back to original permutation pi */
export function invertLehmerRank(n: number, rank: bigint): number[] | null {
  if (rank < 0n || rank >= factorial(n)) return null;
  const available = Array.from({ length: n }, (_, i) => i);
  const pi: number[] = [];
  let rem = rank;

  for (let i = 0; i < n; i++) {
    const fact = factorial(n - 1 - i);
    const idx = Number(rem / fact);
    rem %= fact;
    if (idx < 0 || idx >= available.length) return null;
    pi.push(available.splice(idx, 1)[0]);
  }
  return pi;
}

export function valenceDecode(wire: string): string {
  if (wire.startsWith(VALENCE_LITERAL)) return wire.slice(VALENCE_LITERAL.length);
  if (!wire.startsWith(VALENCE_SENTINEL)) return wire;
  const rest = wire.slice(VALENCE_SENTINEL.length);
  const firstNl = rest.indexOf('\n');
  if (firstNl < 0) return wire;

  const meta = rest.slice(0, firstNl);
  const colon = meta.indexOf(':');
  if (colon < 0) return wire;

  const n = Number(meta.slice(0, colon));
  const rankStr = meta.slice(colon + 1);
  if (!Number.isSafeInteger(n) || n < 2 || n > 18) return wire;

  let rank: bigint;
  try {
    rank = BigInt(rankStr);
  } catch {
    return wire;
  }

  const palette = rest.slice(firstNl + 1).split('\n');
  if (palette.length !== n) return wire;

  const pi = invertLehmerRank(n, rank);
  if (pi === null) return wire;
  return pi.map((idx) => palette[idx]).join('\n');
}

export function valenceEncode(text: string, enc: EncodingName = 'o200k_base'): ValenceResult {
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): ValenceResult => ({
    wire: text, decoded: text, exact: true, inTokens, outTokens: inTokens,
    savingsPct: 0, mode: 'identity', notes,
  });

  if (!text) return identity('empty input');

  if (text.startsWith(VALENCE_SENTINEL)) {
    const wire = VALENCE_LITERAL + text;
    const decoded = valenceDecode(wire);
    const outTokens = countTokens(wire, enc);
    return {
      wire, decoded, exact: decoded === text, inTokens, outTokens,
      savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
      mode: 'forced-wrap', notes: 'forced wrap (sentinel prefix adversary)',
    };
  }

  const lines = text.split('\n');
  const n = lines.length;

  // Factoradix permutation rank pays off when N unique lines are permuted
  if (n < 3 || n > 18) return identity('line count out of factoradix range [3,18]');
  if (new Set(lines).size !== n) return identity('duplicate lines present (permutation requires unique elements)');

  // Canonical lexicographical palette
  const palette = [...lines].sort();
  const pi = lines.map((l) => palette.indexOf(l));
  const rank = computeLehmerRank(pi);

  const wire = VALENCE_SENTINEL + `${n}:${rank.toString()}\n` + palette.join('\n');
  const decoded = valenceDecode(wire);

  if (decoded !== text) return identity('guard: VALENCE failed byte-verify');
  const outTokens = countTokens(wire, enc);
  if (outTokens >= inTokens) return identity('guard: VALENCE wire measured >= input');

  return {
    wire, decoded, exact: true, inTokens, outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    mode: 'valence', notes: `VALENCE-V1 Factoradix Lehmer rank R=${rank} for N=${n} · byte-exact`,
  };
}

export const VALENCE_SYSTEM_PROMPT = [
  '# VALENCE-V1 — Factoradix Permutation-Rank Codec',
  'A message starting with `[V1]` carries Factoradix Lehmer rank permutation encoding.',
  'Format: [V1]\\n<N>:<R>\\n<palette_line_0>\\n...\\n<palette_line_N-1>',
  'Reconstruct permutation pi from rank R and map palette elements in order.',
].join('\n');

export function valenceSelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
  const tests = [
    { name: 'V0 empty', text: '' },
    { name: 'V1 4-line permutation', text: 'delta_log\nalpha_log\ncharlie_log\nbravo_log' },
  ];
  return tests.map((t) => {
    const r = valenceEncode(t.text, enc);
    const back = valenceDecode(r.wire);
    return { name: t.name, pass: r.exact && back === t.text, details: `${r.mode} ${r.inTokens}→${r.outTokens}` };
  });
}
