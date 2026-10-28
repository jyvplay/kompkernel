import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
function walk(d: string, acc: string[] = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(txt|md|json|csv|tsv|log|ts|js|jsx|xml|sql|svg|tex|patch|html)$/.test(e.name)) acc.push(p);
  }
  return acc;
}
const dirs = ['bench/holdout', 'bench/holdout-ops', 'bench/holdout-tbl', 'bench/holdout-mk', 'bench/holdout-tab', 'bench/holdout-work', 'bench/holdout-lang', 'bench/holdout-x40'];
const all: string[] = [];
for (const d of dirs) { try { walk(d, all); } catch {} }
const rows: Array<[string, number, number]> = [];
for (const f of all.sort()) {
  const text = fs.readFileSync(f, 'utf8');
  rows.push([f, text.length, countTokens(text, enc)]);
}
rows.sort((a, b) => b[2] - a[2]);
for (const [f, ch, tk] of rows) console.log(String(tk).padStart(6), String(ch).padStart(7), f);
