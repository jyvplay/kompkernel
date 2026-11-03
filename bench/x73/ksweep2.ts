/**
 * X73 probe 2: separate the two effects.
 *   (a) column-major transposition alone — split each line on runs of spaces,
 *       group by column index, join each column with TAB, columns with LF.
 *   (b) the same, with cells re-joined after the transposition (a sanity check
 *       that the reordering is information-preserving modulo the gaps).
 * No contract is charged here. This is the upper-bound probe: if transposition
 * does not shrink the RAW text by a lot, no contract can pay for it.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const lines = t.split('\n');
  const counts = new Map<number, number>();
  for (const l of lines) if (l.trim()) counts.set(l.split(/ +/).length, (counts.get(l.split(/ +/).length) ?? 0) + 1);
  const K = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
  const cols: string[][] = Array.from({ length: K }, () => []);
  const lit: string[] = [];
  for (const l of lines) {
    const cs = l.trim() ? l.trim().split(/ +/) : [];
    if (cs.length === K) { for (let c = 0; c < K; c++) cols[c].push(cs[c]); }
    else lit.push(l);
  }
  const rows = cols[0]?.length ?? 0;
  if (!rows) { console.log(`${p}: no columns`); continue; }
  const colMajor = cols.map(c => c.join('\t')).join('\n') + (lit.length ? '\n' + lit.map(x => '\\' + x).join('\n') : '');
  const rowMajor = Array.from({ length: rows }, (_, r) => cols.map(c => c[r]).join('\t')).join('\n');
  const raw = countTokens(t, enc);
  const cm = countTokens(colMajor, enc);
  // baseline that keeps the tabs but not the transposition, i.e. the same cells
  const rm = countTokens(rowMajor, enc) + (lit.length ? countTokens(lit.map(x => '\\' + x).join('\n'), enc) : 0);
  console.log(`${p.split('/').pop().padEnd(26)} raw ${String(raw).padStart(5)} K=${K} rows=${rows} tabRowMajor ${String(rm).padStart(5)} tabColMajor ${String(cm).padStart(5)}  (${(100 * (cm - raw) / raw).toFixed(1)}% vs raw, ${(100 * (cm - rm) / rm).toFixed(1)}% vs tab-row)`);
}
