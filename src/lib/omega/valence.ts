/**
 * src/lib/omega/valence.ts
 * =============================================================================
 * VALENCE-V1 — Factoradix Permutation-Rank & Token-Quorum Lossless Codec
 *
 * DYNAMIC ALGORITHM:
 *   - Identifies ordered or permuted sequences of N lines/items.
 *   - Factors common line prefixes and suffixes across palette items using code-point
 *     safe string operations.
 *   - Maps permutation pi in S_N to Factoradix Lehmer rank R in [0, N! - 1].
 *   - Evaluates exact BPE token savings: only emits when outTokens < inTokens.
 *   - 100% byte-exact, deterministic, zero-CoT overhead, prompt-native decoding.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';

export interface ValenceResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  n: number;
  rank: bigint;
  notes: string;
}

export function permutationToLehmerRank(pi: number[]): bigint {
  const n = pi.length;
  if (n === 0) return 0n;
  const available = Array.from({ length: n }, (_, i) => i);
  let rank = 0n;

  const fact: bigint[] = [1n];
  for (let i = 1; i <= n; i++) {
    fact.push(fact[i - 1] * BigInt(i));
  }

  for (let i = 0; i < n; i++) {
    const elem = pi[i];
    const idx = available.indexOf(elem);
    rank += BigInt(idx) * fact[n - 1 - i];
    available.splice(idx, 1);
  }

  return rank;
}

export function lehmerRankToPermutation(n: number, rank: bigint): number[] {
  if (n === 0) return [];
  const available = Array.from({ length: n }, (_, i) => i);
  const pi: number[] = [];

  const fact: bigint[] = [1n];
  for (let i = 1; i <= n; i++) {
    fact.push(fact[i - 1] * BigInt(i));
  }

  let currentRank = rank;
  for (let i = 0; i < n; i++) {
    const f = fact[n - 1 - i];
    const idx = Number(currentRank / f);
    currentRank = currentRank % f;
    pi.push(available[idx]);
    available.splice(idx, 1);
  }

  return pi;
}

/** Find common prefix across string list (code point safe) */
function commonPrefix(strings: string[]): string {
  if (strings.length === 0) return '';
  let preChars = Array.from(strings[0]);
  for (let i = 1; i < strings.length; i++) {
    const chars = Array.from(strings[i]);
    let j = 0;
    while (j < preChars.length && j < chars.length && preChars[j] === chars[j]) {
      j++;
    }
    preChars = preChars.slice(0, j);
    if (preChars.length === 0) break;
  }
  return preChars.join('');
}

/** Find common suffix across string list (code point safe) */
function commonSuffix(strings: string[], prefixLen: number): string {
  if (strings.length === 0) return '';
  const tails = strings.map((s) => Array.from(s).slice(prefixLen));
  if (tails.length === 0 || tails[0].length === 0) return '';

  let sufChars = [...tails[0]].reverse();
  for (let i = 1; i < tails.length; i++) {
    const rev = [...tails[i]].reverse();
    let j = 0;
    while (j < sufChars.length && j < rev.length && sufChars[j] === rev[j]) {
      j++;
    }
    sufChars = sufChars.slice(0, j);
    if (sufChars.length === 0) break;
  }
  return sufChars.reverse().join('');
}

export function valenceEncode(text: string, enc: EncodingName = 'o200k_base'): ValenceResult {
  const inTokens = countTokens(text, enc);
  const fallback: ValenceResult = {
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    n: 0,
    rank: 0n,
    notes: 'VALENCE identity fallback',
  };

  if (!text || text.length < 15) return fallback;

  if (text.startsWith('[V1]\n') || text.startsWith('[V1L]\n')) {
    const wrap = '[V1L]\n' + text;
    const outTokens = countTokens(wrap, enc);
    return {
      wire: wrap,
      decoded: text,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: 0,
      n: 0,
      rank: 0n,
      notes: 'VALENCE literal wrap',
    };
  }

  const lines = text.split('\n');
  if (lines.length < 3) return fallback;

  const uniqueLines = Array.from(new Set(lines));
  if (uniqueLines.length !== lines.length) return fallback;

  // Factor common prefix and suffix to compress the palette
  const pre = commonPrefix(lines);
  const suf = commonSuffix(lines, Array.from(pre).length);

  const preLen = Array.from(pre).length;
  const sufLen = Array.from(suf).length;

  const stripped = lines.map((l) => {
    const chars = Array.from(l);
    const end = sufLen > 0 ? chars.length - sufLen : undefined;
    return chars.slice(preLen, end).join('');
  });

  const palette = [...stripped].sort();
  const n = lines.length;

  const pi = stripped.map((s) => palette.indexOf(s));
  const rank = permutationToLehmerRank(pi);

  const wire = `[V1]\n${n}:${rank.toString()}\n^${pre}\n$${suf}\n${palette.join('\n')}`;
  const outTokens = countTokens(wire, enc);

  const decoded = valenceDecode(wire);
  const exact = decoded === text;

  if (exact && outTokens < inTokens) {
    return {
      wire,
      decoded,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: ((inTokens - outTokens) / inTokens) * 100,
      n,
      rank,
      notes: `VALENCE-V1 Factoradix N=${n} rank=${rank.toString()} · byte-exact`,
    };
  }

  return fallback;
}

export function valenceDecode(wire: string): string {
  if (wire.startsWith('[V1L]\n')) return wire.slice(6);
  if (!wire.startsWith('[V1]\n')) return wire;
  const rest = wire.slice(5);
  const lines = rest.split('\n');
  if (lines.length < 4) return wire;

  const head = lines[0];
  const parts = head.split(':');
  if (parts.length !== 2) return wire;

  const n = Number(parts[0]);
  const rankStr = parts[1];
  if (!Number.isSafeInteger(n) || n < 1 || !/^\d+$/.test(rankStr)) return wire;

  const preLine = lines[1];
  const sufLine = lines[2];
  if (!preLine.startsWith('^') || !sufLine.startsWith('$')) return wire;

  const pre = preLine.slice(1);
  const suf = sufLine.slice(1);

  const palette = lines.slice(3);
  if (palette.length !== n) return wire;

  try {
    const rank = BigInt(rankStr);
    const pi = lehmerRankToPermutation(n, rank);
    if (pi.some((idx) => !Number.isSafeInteger(idx) || idx < 0 || idx >= palette.length)) {
      return wire;
    }
    return pi.map((idx) => `${pre}${palette[idx]}${suf}`).join('\n');
  } catch {
    return wire;
  }
}

export function valenceSelfTest(enc: EncodingName = 'o200k_base'): boolean {
  const sample = Array.from({ length: 12 }, (_, i) => `long identical common prefix string for item number ${ (11 - i) * 3 } with identical suffix tail`).join('\n');
  const res = valenceEncode(sample, enc);
  const back = valenceDecode(res.wire);
  return back === sample;
}
