/**
 * X40 step 3 — PROXY: is a column-major re-serialisation cheaper in o200k tokens
 * than the source's row-major order? No codec, no parent: just the tokenizer, so
 * the answer costs seconds instead of minutes. Winners get a real encode.
 */
import * as fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc: any = 'o200k_base';
const SEPS = ['\t', ',', '|', ';'];
for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p, 'utf8');
  const lines = t.split('\n').map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l));
  let best: any = null;
  for (const sep of SEPS) {
    const rows = lines.filter((l) => l.trim().length).map((l) => l.split(sep));
    const cnt = new Map<number, number>();
    for (const r of rows) cnt.set(r.length, (cnt.get(r.length) ?? 0) + 1);
    for (const [k, m] of cnt) {
      if (k < 2 || m < 8) continue;
      if (!best || m > best.m) best = { sep, k, m, rows: rows.filter((r) => r.length === k) };
    }
  }
  if (!best) { console.log(p.split('/').pop()!.padEnd(22), 'no table'); continue; }
  const { sep, k, rows } = best;
  const row = rows.map((r: string[]) => r.join(sep)).join('\n') + '\n';
  const colNl = 'T ' + k + ' ' + (sep === '\t' ? 'tab' : sep) + '\n' +
    Array.from({ length: k }, (_, i) => rows.map((r: string[]) => r[i]).join('\n')).join('\n#\n') + '\n';
  const colSep = 'T ' + k + ' ' + (sep === '\t' ? 'tab' : sep) + '\n' +
    Array.from({ length: k }, (_, i) => rows.map((r: string[]) => r[i]).join(sep)).join('\n') + '\n';
  const a = countTokens(row, enc), b = countTokens(colNl, enc), c = countTokens(colSep, enc);
  console.log(p.split('/').pop()!.padEnd(22), 'k=' + k, 'rows=' + rows.length,
    'row=' + a, 'colNL=' + b + '(' + (b - a >= 0 ? '+' : '') + (b - a) + ')',
    'colSep=' + c + '(' + (c - a >= 0 ? '+' : '') + (c - a) + ')');
}
