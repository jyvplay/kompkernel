/**
 * src/lib/omega/anaphora-fold.ts
 * =============================================================================
 * ANAPHORA-FOLD (X12) — two-sided field anchoring against the best of the K lines above.
 *
 * STATUS: NEGATIVE, UNREGISTERED. Byte-exact (TS round trip and CPython reader,
 * 15/15 forced fold messages), but G3 rejects every fold on every measured lane:
 * DAEDALUS already encodes the repeated heads and tails as glyphs, so removing
 * them makes the DAEDALUS wire larger (openstack +72, ls-l-omega +92, psql +60).
 * Raw-token ceilings are not realisable savings. See bench/z57/REPORT.md.
 * This file is NOT the shipped ANAPHORA (AN1) codec in ./anaphora.ts.
 *
 * WHY THIS IS A DIFFERENT MECHANISM
 * -----------------------------------------------------------------------------
 * The existing line-level folds reference ONE line: DIRFOLD copies a directory
 * prefix of the line above; DITTO marks a field equal to the same field of the
 * line above (position-aligned, one side only); AKOLOUTHIA copies a numeric
 * progression from the two lines above. ANAPHORA references any of the K lines
 * above (the best one for this line), and anchors BOTH ends: the first n
 * space-separated fields and the last m space-separated fields are copied from
 * that reference line; only the middle is written. A line that agrees with an
 * older line in its head and tail (ps/ls/df rows, log records, path listings
 * with a varying middle segment) is carried as one header plus the variable part.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   literal line:  any line that does not begin with the fold header
 *   fold line:     @k,n,m|X
 *       the decoded line i = (line i-k of the decoded output) with its first n
 *       fields and its last m fields kept, and X (space-joined) between them.
 *       X is empty when there are no middle fields.
 * The fold header is escaped by refusal: an input that contains a line matching
 * the header pattern is never folded (identity arm).
 *
 * ENCODER (greedy, deterministic)
 * -----------------------------------------------------------------------------
 * For each line i (in order, against the ORIGINAL lines), try k = 1..min(K, i),
 * compute n (longest common field prefix) and m (longest common field suffix
 * with n+m <= fields(i)), and keep the k that covers the most characters
 * (ties: the nearest k). Write the fold only if its o200k cost is strictly less
 * than the literal line. No search over sets of folds; one left-to-right pass.
 *
 * GATES (encoder; every failure returns the identity arm = plain DAEDALUS)
 * -----------------------------------------------------------------------------
 *   G1  anaphoraFoldExpand(folded) === input (exact, in TypeScript)
 *   G2  DAEDALUS round trip on the folded text
 *   G3  one-chat M (contract + DAEDALUS message) < plain DAEDALUS M
 *
 * TIME / CPU
 * -----------------------------------------------------------------------------
 *   Fold search: O(L * K * F) field comparisons (L lines, K <= 16, F fields per
 *   line), plus one o200k count per candidate line that has a fold (two counts
 *   per line). Decoder: O(output size). The dominant cost is token counting
 *   (BPE), as for AKOLOUTHIA-2; the gates add two more DAEDALUS passes.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, type DaedalusResult } from './daedalus';

export const ANAPHORA_FOLD_K = 16;
const HEADER = /^@(\d+),(\d+),(\d+)\|/;

export const ANAPHORA_FOLD_CONTRACT =
  'A line "@k,n,m|X" is the decoded line k lines above it, keeping its first n and last m space-separated fields, with the fields of X (space-joined; empty X = none) between them; every other line is literal.';

/** Encoder: fold each line against the best of the K lines above it. Returns the folded text and fold count. */
export function anaphoraFoldSubstitute(text: string, K = ANAPHORA_FOLD_K, enc: EncodingName = 'o200k_base'): { out: string; folds: number } {
  const lines = text.split('\n');
  if (lines.some(l => HEADER.test(l))) return { out: text, folds: 0 };
  const fields = lines.map(l => l.split(' '));
  const out: string[] = [];
  let folds = 0;
  for (let i = 0; i < lines.length; i++) {
    const F = fields[i];
    const literal = lines[i];
    let best: { k: number; n: number; m: number; cover: number; X: string } | null = null;
    for (let k = 1; k <= Math.min(K, i); k++) {
      const R = fields[i - k];
      let n = 0;
      while (n < F.length && n < R.length && F[n] === R[n]) n++;
      let m = 0;
      while (m < F.length - n && m < R.length && F[F.length - 1 - m] === R[R.length - 1 - m]) m++;
      if (n + m === 0) continue;
      const mid = F.slice(n, F.length - m);
      if (mid.length === 1 && mid[0] === '') continue;           // one empty field is not representable
      const X = mid.join(' ');
      const cover = F.slice(0, n).join(' ').length + F.slice(F.length - m).join(' ').length;
      if (!best || cover > best.cover) best = { k, n, m, cover, X };
    }
    if (best) {
      const wire = `@${best.k},${best.n},${best.m}|${best.X}`;
      if (countTokens(wire, enc) < countTokens(literal, enc)) {
        out.push(wire);
        folds++;
        continue;
      }
    }
    out.push(literal);
  }
  return { out: out.join('\n'), folds };
}

/** Reader: exact inverse of anaphoraFoldSubstitute (the same rule the LLM applies). */
export function anaphoraFoldExpand(wire: string): string {
  const lines = wire.split('\n');
  const decoded: string[] = [];
  for (const w of lines) {
    const h = HEADER.exec(w);
    if (!h) { decoded.push(w); continue; }
    const k = Number(h[1]), n = Number(h[2]), m = Number(h[3]);
    const X = w.slice(h[0].length);
    const i = decoded.length;
    if (k < 1 || k > i) throw new Error(`anaphora: bad reference k=${k} at line ${i}`);
    const R = decoded[i - k].split(' ');
    if (n > R.length || m > R.length) throw new Error(`anaphora: field count out of range at line ${i}`);
    const mid = X === '' ? [] : X.split(' ');
    decoded.push([...R.slice(0, n), ...mid, ...R.slice(R.length - m)].join(' '));
  }
  return decoded.join('\n');
}

export interface AnaphoraResult {
  codec: 'anaphora';
  arm: 'fold' | 'identity';
  wire: string;
  decoded: string;
  exact: boolean;
  folds: number;
  inTokens: number;
  messageTokens: number;
  daedalus: DaedalusResult;
  decoderPrompt: string;
  notes: string;
}

export function anaphoraFoldEncode(text: string, enc: EncodingName = 'o200k_base', K = ANAPHORA_FOLD_K): AnaphoraResult {
  const inTokens = countTokens(text, enc);
  const plain = daedalusEncode(text, enc);
  const identity: AnaphoraResult = {
    codec: 'anaphora', arm: 'identity', wire: plain.wire, decoded: plain.decoded, exact: plain.exact,
    folds: 0, inTokens, messageTokens: plain.messageTokens, daedalus: plain, decoderPrompt: plain.decoderPrompt,
    notes: 'identity arm (DAEDALUS plain)',
  };
  const { out, folds } = anaphoraFoldSubstitute(text, K, enc);
  if (folds === 0) return identity;
  let back: string;
  try { back = anaphoraFoldExpand(out); } catch { return identity; }
  if (back !== text) return identity;                                       // G1
  const d = daedalusEncode(out, enc);
  if (!d.exact || daedalusDecode(d.wire) !== out) return identity;          // G2
  const decoderPrompt = ANAPHORA_FOLD_CONTRACT + '\n' + d.decoderPrompt;
  const M = countTokens(decoderPrompt, enc);
  if (M >= identity.messageTokens) {                                        // G3
    return { ...identity, notes: `identity: fold arm ${M} >= identity ${identity.messageTokens}` };
  }
  return {
    codec: 'anaphora', arm: 'fold', wire: d.wire, decoded: text, exact: true, folds, inTokens,
    messageTokens: M, daedalus: d, decoderPrompt,
    notes: `folds=${folds}; fold M=${M} vs identity ${identity.messageTokens}`,
  };
}

/** Arm-aware library reader. */
export function anaphoraFoldDecode(wire: string, arm: 'fold' | 'identity' = 'fold'): string {
  const expanded = daedalusDecode(wire);
  return arm === 'fold' ? anaphoraFoldExpand(expanded) : expanded;
}
