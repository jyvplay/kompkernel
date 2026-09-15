/**
 * TRIE-T1 — exact prefix-trie factoring for repeated line families.
 *
 * Inspired by recent trie-structured log compressors, this lane factors the
 * longest common prefix of a line family once and stores the suffix stream as a
 * compact JSON list. It is intentionally local and conservative: only a single
 * family covering the whole region is admitted, then real BPE cost and exact
 * reconstruction decide whether the representation survives.
 */
import { countTokens, type EncodingName } from './bpe';

const START = '[TR1]\n';
export interface TrieResult { wire: string; decoded: string; exact: boolean; applied: boolean; inTokens: number; outTokens: number; notes: string }

export function trieDecode(wire: string): string {
  if (!wire.startsWith(START)) return wire;
  try {
    const x = JSON.parse(wire.slice(START.length)) as [string, string[], boolean];
    if (!Array.isArray(x) || typeof x[0] !== 'string' || !Array.isArray(x[1]) || typeof x[2] !== 'boolean') return wire;
    return x[1].map((s) => x[0] + s).join('\n') + (x[2] ? '\n' : '');
  } catch { return wire; }
}

export function trieEncode(text: string, enc: EncodingName = 'o200k_base'): TrieResult {
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): TrieResult => ({ wire: text, decoded: text, exact: true, applied: false, inTokens, outTokens: inTokens, notes });
  if (text.length < 96 || !text) return identity('below trie admission floor');
  const trailing = text.endsWith('\n');
  const lines = text.split('\n');
  if (trailing) lines.pop();
  if (lines.length < 4 || lines.some((line) => line.length < 3)) return identity('fewer than four nontrivial lines');
  let prefix = lines[0];
  for (const line of lines.slice(1)) {
    let n = 0;
    while (n < prefix.length && n < line.length && prefix[n] === line[n]) n++;
    prefix = prefix.slice(0, n);
    if (prefix.length < 3) return identity('common prefix below threshold');
  }
  const suffixes = lines.map((line) => line.slice(prefix.length));
  const wire = START + JSON.stringify([prefix, suffixes, trailing]);
  const decoded = trieDecode(wire);
  const outTokens = countTokens(wire, enc);
  if (decoded !== text || outTokens >= inTokens) return identity('exactness or BPE gate rejected trie');
  return { wire, decoded, exact: true, applied: true, inTokens, outTokens, notes: `TRIE prefix factoring: ${lines.length} lines, prefix ${prefix.length} chars` };
}

export const TRIE_SYSTEM_PROMPT = 'TRIE-T1 exact: [TR1] JSON [prefix,suffixes,trailingNewline] reconstructs each line as prefix plus suffix, joined by newline; preserve the final newline flag.';
