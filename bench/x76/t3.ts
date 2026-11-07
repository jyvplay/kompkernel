/**
 * X76 / t3 — HOW MUCH DOES INTER-COLUMN PADDING COST?
 *
 * In an aligned table the spaces between columns are pure redundancy: they are fixed by
 * the column width and the value length. This measures the token cost of that padding
 * per lane, which is the ceiling for any "strip the padding, re-pad on read" mechanic.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const base = T(t, enc);
  // collapse every run of >=2 spaces to a single space
  const squeezed = t.replace(/ {2,}/g, ' ');
  const sq = T(squeezed, enc);
  // count the padding characters themselves
  let padChars = 0;
  for (const m of t.matchAll(/ {2,}/g)) padChars += m[0].length - 1;
  rows.push({ path: p, base, squeezed: sq, save: base - sq, padChars, pct: +((base - sq) / base * 100).toFixed(1) });
  console.log(`${p.split('/').pop()!.padEnd(22)} ${String(base).padStart(5)} -> squeeze ${String(sq).padStart(5)}  save ${String(base - sq).padStart(4)} (${((base - sq) / base * 100).toFixed(1)}%)  padChars ${padChars}`);
}
rows.sort((a, b) => b.save - a.save);
console.log(`\nTOTAL base ${rows.reduce((a, b) => a + b.base, 0)} squeezed ${rows.reduce((a, b) => a + b.squeezed, 0)} save ${rows.reduce((a, b) => a + b.save, 0)}`);
fs.writeFileSync('bench/x76/receipts/padding.json', JSON.stringify(rows, null, 1) + '\n');
