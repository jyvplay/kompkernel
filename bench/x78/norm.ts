/**
 * X78 — STRUCTURAL NORMALISATION SCREEN.
 * X77 measured that the frontier's marginal rate on padding is 0.11: it compresses
 * runs of spaces to almost nothing. So ADDING padding to make ragged structure
 * uniform should cost ~0.11x its raw token count, while a table codec that now fires
 * can pay far more than that. This screens several normalisers on frontier tokens.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const RULE = 9; // rough token cost of the one-line restore rule; conservative

const n1 = (sep: string) => (s: string) => {          // align prefixes before `sep`
  const lines = s.split('\n');
  const idx: number[] = [];
  for (let i = 0; i < lines.length; i++) { const k = lines[i].indexOf(sep); if (k > 0) idx.push(i); else idx.push(-1); }
  if (idx.filter((x) => x >= 0).length < 4) return null;
  let w = 0;
  for (const i of idx) if (i >= 0) w = Math.max(w, lines[i].slice(0, idx[i] === undefined ? 0 : lines[i].indexOf(sep)).length);
  if (w <= 0) return null;
  return lines.map((l, i) => {
    const k = l.indexOf(sep);
    if (k < 0) return l;
    const pre = l.slice(0, k);
    if (/\s/.test(pre)) return l;           // guard: prefix must contain no space
    return pre + ' '.repeat(w - pre.length) + l.slice(k);
  }).join('\n');
};
const padRight = (s: string) => {                      // pad every line to equal width
  const lines = s.split('\n');
  const w = Math.max(...lines.map((l) => l.length));
  if (w <= 0 || lines.length < 4) return null;
  return lines.map((l) => l + ' '.repeat(w - l.length)).join('\n');
};
const NORM: Array<[string, (s: string) => string | null]> = [
  ['align-colon', n1(':')],
  ['align-eq', n1('=')],
  ['align-space', n1(' ')],
  ['pad-right', padRight],
];
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const F: any = tagstackEncode(S, enc);
  const base = F.messageTokens;
  const parts: string[] = [];
  for (const [name, f] of NORM) {
    const A = f(S);
    if (A === null || A === S) { parts.push(`${name} n/a`.padEnd(20)); continue; }
    const FA: any = tagstackEncode(A, enc);
    const d = FA.messageTokens + RULE - base;
    parts.push(`${name} ${d >= 0 ? '+' : ''}${d}`.padEnd(20));
    fs.writeFileSync('bench/x78/receipts/norm.json', JSON.stringify(rows, null, 1) + '\n');
  }
  const line = { path: p, base, out: parts.slice() };
  rows.push(line);
  fs.writeFileSync('bench/x78/receipts/norm.json', JSON.stringify(rows, null, 1) + '\n');
  console.log(`${p.split('/').pop()!.padEnd(22)} F ${String(base).padStart(5)} | ${parts.join('| ')}`);
}
