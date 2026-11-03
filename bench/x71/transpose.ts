/**
 * Does transposing a record listing (columns streamed one after another)
 * reduce the token count? Free probe: no contract is added, so a win here is
 * a lower bound on what a transpose codec could win before its rule cost.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const T = (s: string) => countTokens(s, enc);
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const raw = T(text);
  const lines = text.split('\n');
  const rows = lines.map((l) => (l.trim() ? l.trim().split(/ {2,}/) : []));
  const k = Math.max(...rows.map((r) => r.length));
  const cols: string[] = [];
  for (let c = 0; c < k; c++) cols.push(rows.map((r) => r[c] ?? '').join('\n'));
  const transposed = cols.join('\n\n');
  // also: whole-word transpose (split on single spaces) for non-aligned data
  const rows2 = lines.map((l) => (l.trim() ? l.trim().split(/ +/) : []));
  const k2 = Math.max(...rows2.map((r) => r.length));
  const cols2: string[] = [];
  for (let c = 0; c < k2; c++) cols2.push(rows2.map((r) => r[c] ?? '').join('\n'));
  const transposed2 = cols2.join('\n\n');
  // per-line shape stream: how many distinct row shapes
  const shapes = new Set(rows.map((r) => r.length)).size;
  console.error(`${p}\n  raw ${raw} | aligned-transpose ${T(transposed)} (k=${k}, ${raw - T(transposed)}) | word-transpose ${T(transposed2)} (k=${k2}, ${raw - T(transposed2)}) | shapes ${shapes}`);
}
