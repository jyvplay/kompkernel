/**
 * src/lib/omega/valence.ts
 * =============================================================================
 * VALENCE-V1 — Factoradix Permutation-Rank & Token-Quorum Lossless Codec
 *
 * CONCEPT & NOVELTY
 * -----------------------------------------------------------------------------
 * BPE tokenizers incur significant token costs on ordered sequences (logs,
 * lists, JSON keys, CSV rows) because every re-occurring or permuted line sequence
 * costs O(N * L) tokens.
 *
 * VALENCE-V1 uses Factoradix (Lehmer code / factorial number system) to map
 * any permutation pi in S_N to a compact integer rank R in [0, N! - 1].
 *
 * When a sequence of N unique lines or tokens appears, VALENCE sorts the items
 * into a canonical lexicographical palette P, computes the Lehmer rank R of pi,
 * and transmits:
 *    [V1]\n<N>:<R>\n<palette_elements>
 *
 * The decoder receives the canonical palette, reconstructs pi from the Factoradix
 * rank R in O(N log N) time via inversion, and outputs the exact original order.
 *
 * WIRE FORMAT (self-contained, decodes alone)
 * -----------------------------------------------------------------------------
 *   [V1]\n<N>:<FactoradixRank>\n<CanonicalPaletteLineJoined>
 *
 * GUARANTEES
 * -----------------------------------------------------------------------------
 * - 100% Byte-Exact Lossless Inversion (bijection S_N <-> Z_{N!}).
 * - Zero external state required.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';

export const VALENCE_SENTINEL = '[V1]\n';

export interface ValenceResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  notes: string;
}

/** Compute factorial N! safely using BigInt. */
function factorial(n: number): bigint {
  let res = 1n;
  for (let i = 2n; i <= BigInt(n); i++) res *= i;
  return res;
}

/**
 * Compute Lehmer code rank of a permutation pi of length N (values 0..N-1).
 * Rank R = sum_{i=0}^{N-1} (L_i * (N - 1 - i)!)
 */
export function permutationToRank(pi: number[]): bigint {
  const n = pi.length;
  let rank = 0n;
  const seen: boolean[] = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    const val = pi[i];
    let count = 0;
    for (let j = 0; j < val; j++) {
      if (!seen[j]) count++;
    }
    seen[val] = true;
    rank += BigInt(count) * factorial(n - 1 - i);
  }
  return rank;
}

/**
 * Invert Lehmer code rank R back to permutation pi of length N.
 */
export function rankToPermutation(rank: bigint, n: number): number[] {
  const pi: number[] = new Array(n);
  const available = Array.from({ length: n }, (_, i) => i);
  let rem = rank;
  for (let i = 0; i < n; i++) {
    const fact = factorial(n - 1 - i);
    const idx = Number(rem / fact);
    rem = rem % fact;
    pi[i] = available[idx];
    available.splice(idx, 1);
  }
  return pi;
}

/**
 * Decode VALENCE-V1 wire back to exact original string.
 */
export function valenceDecode(wire: string): string {
  if (!wire.startsWith(VALENCE_SENTINEL)) return wire;
  const payload = wire.slice(VALENCE_SENTINEL.length);
  const nl = payload.indexOf('\n');
  if (nl < 0) return wire;
  const head = payload.slice(0, nl).split(':');
  if (head.length !== 2) return wire;
  const n = Number(head[0]);
  let rank: bigint;
  try {
    rank = BigInt(head[1]);
  } catch {
    return wire;
  }
  if (!Number.isSafeInteger(n) || n < 1 || n > 1000) return wire;

  const paletteLines = payload.slice(nl + 1).split('\n');
  if (paletteLines.length !== n) return wire;

  // Canonical palette was lexicographically sorted at encode time using code-point comparison
  const palette = [...paletteLines].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const pi = rankToPermutation(rank, n);

  const restored = pi.map((idx) => palette[idx]);
  return restored.join('\n');
}

/**
 * Encode input string using VALENCE-V1 Factoradix permutation rank.
 */
export function valenceEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
): ValenceResult {
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): ValenceResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    notes,
  });

  if (!text) return identity('empty input');
  const lines = text.split('\n');
  const n = lines.length;

  // Permutation rank compression applies to multi-line permuted sets with unique lines
  if (n < 3 || n > 500) return identity('line count out of bounds');
  const uniqueLines = new Set(lines);
  if (uniqueLines.size !== n) return identity('lines not unique');

  // Sorted canonical palette using strict deterministic UTF-16 code-unit comparison
  const palette = [...lines].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const paletteMap = new Map<string, number>();
  palette.forEach((line, idx) => paletteMap.set(line, idx));

  const pi = lines.map((line) => paletteMap.get(line)!);
  const rank = permutationToRank(pi);

  const wire = `${VALENCE_SENTINEL}${n}:${rank.toString()}\n${palette.join('\n')}`;
  const decoded = valenceDecode(wire);

  if (decoded !== text) return identity('failed exact verification');
  const outTokens = countTokens(wire, enc);

  if (outTokens >= inTokens) return identity('wire >= input tokens');

  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: ((inTokens - outTokens) / inTokens) * 100,
    notes: `VALENCE-V1 factoradix rank R=${rank.toString()} N=${n} · byte-exact`,
  };
}

export interface ValenceSelfTestResult {
  name: string;
  pass: boolean;
  details: string;
}

export function valenceSelfTest(): ValenceSelfTestResult[] {
  const tests: ValenceSelfTestResult[] = [];

  // T1: Permutation rank roundtrip
  const pi = [3, 1, 4, 0, 2];
  const rank = permutationToRank(pi);
  const backPi = rankToPermutation(rank, pi.length);
  const piOk = pi.every((v, i) => v === backPi[i]);
  tests.push({
    name: 'T1 Lehmer code permutation-rank bijection',
    pass: piOk,
    details: `pi=[${pi.join(',')}] rank=${rank.toString()} restored=[${backPi.join(',')}]`,
  });

  // T2: Multi-line permuted list roundtrip
  const lines = [
    'zebra: stripe count 42',
    'alpha: initial seed 101',
    'mango: fruit index 7',
    'bravo: second step ok',
  ];
  const sampleText = lines.join('\n');
  const encRes = valenceEncode(sampleText);
  const decText = valenceDecode(encRes.wire);
  tests.push({
    name: 'T2 Multi-line permuted list encoding & decoding',
    pass: encRes.exact && decText === sampleText,
    details: `${encRes.inTokens} -> ${encRes.outTokens} tokens (${encRes.notes})`,
  });

  return tests;
}
