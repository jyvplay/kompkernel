/**
 * COLUMN-C1 — exact two-sided column factoring for line families.
 *
 * A prefix trie captures only the left boundary. This lane treats a repeated
 * log family as a one-column table: it factors both the longest common prefix
 * and suffix, and stores only the varying middle values. It is lossless because
 * the complete prefix, suffix, row order, and final-newline bit are transmitted.
 */
import { countTokens, type EncodingName } from './bpe';

const START = '[CL1]\n';
export interface ColumnResult { wire: string; decoded: string; exact: boolean; applied: boolean; inTokens: number; outTokens: number; notes: string }

export function columnDecode(wire: string): string {
  if (!wire.startsWith(START)) return wire;
  try {
    const x = JSON.parse(wire.slice(START.length)) as [string, string, string[], boolean];
    if (!Array.isArray(x) || typeof x[0] !== 'string' || typeof x[1] !== 'string' || !Array.isArray(x[2]) || typeof x[3] !== 'boolean') return wire;
    return x[2].map((m) => x[0] + m + x[1]).join('\n') + (x[3] ? '\n' : '');
  } catch { return wire; }
}

export function columnEncode(text: string, enc: EncodingName = 'o200k_base'): ColumnResult {
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): ColumnResult => ({ wire: text, decoded: text, exact: true, applied: false, inTokens, outTokens: inTokens, notes });
  if (text.length < 96 || !text) return identity('below column admission floor');
  const trailing = text.endsWith('\n');
  const lines = text.split('\n');
  if (trailing) lines.pop();
  if (lines.length < 4 || lines.some((line) => line.length < 4)) return identity('fewer than four nontrivial rows');
  let prefix = lines[0];
  for (const line of lines.slice(1)) {
    let n = 0; while (n < prefix.length && n < line.length && prefix[n] === line[n]) n++;
    prefix = prefix.slice(0, n);
  }
  let suffix = lines[0];
  for (const line of lines.slice(1)) {
    let n = 0; while (n < suffix.length && n < line.length && suffix[suffix.length - 1 - n] === line[line.length - 1 - n]) n++;
    suffix = suffix.slice(suffix.length - n);
  }
  if (prefix.length + suffix.length >= Math.min(...lines.map((x) => x.length)) || prefix.length + suffix.length < 5) return identity('common two-sided frame below threshold');
  const middles = lines.map((line) => line.slice(prefix.length, line.length - suffix.length));
  const wire = START + JSON.stringify([prefix, suffix, middles, trailing]);
  const decoded = columnDecode(wire);
  const outTokens = countTokens(wire, enc);
  if (decoded !== text || outTokens >= inTokens) return identity('exactness or BPE gate rejected column factoring');
  return { wire, decoded, exact: true, applied: true, inTokens, outTokens, notes: `COLUMN two-sided factoring: ${lines.length} rows, frame ${prefix.length + suffix.length} chars` };
}

export const COLUMN_SYSTEM_PROMPT = 'COLUMN-C1 exact: [CL1] JSON [prefix,suffix,middles,trailingNewline] reconstructs each row as prefix plus middle plus suffix, preserving order and final newline.';
