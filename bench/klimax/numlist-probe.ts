// NUMLIST probe: consecutive lines "k. " / "k) " with k = s, s+1, ... over holdout lanes (text-level, before contract).
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '../../src/lib/omega/bpe';
const dirs = ['bench/holdout', 'bench/holdout-lang', 'bench/holdout-mk', 'bench/holdout-ops', 'bench/holdout-tbl', 'bench/holdout-tab', 'bench/holdout-work'];
const files: string[] = [];
for (const d of dirs) for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isFile()) files.push(p); }
const LINE = /^(\d+)([.)]) /;
function transform(T: string): { out: string; blocks: number; items: number } {
  const lines = T.split('\n');
  const out: string[] = []; let blocks = 0, items = 0;
  for (let i = 0; i < lines.length;) {
    const m = LINE.exec(lines[i]);
    if (!m || Number(m[1]) !== 1) { out.push(lines[i]); i++; continue; }
    // block: consecutive lines k=1,2,3... with the same delimiter
    let k = 0; const body: string[] = [];
    while (i + k < lines.length) {
      const mm = LINE.exec(lines[i + k]);
      if (!mm || Number(mm[1]) !== k + 1 || mm[2] !== m[2]) break;
      body.push(lines[i + k].slice(mm[0].length)); k++;
    }
    if (k >= 4) { out.push(`⟦1${m[2]}+${k}⟧`); out.push(...body); blocks++; items += k; i += k; }
    else { out.push(lines[i]); i++; }
  }
  return { out: out.join('\n'), blocks, items };
}
let tin = 0, tout = 0; const rows: string[] = [];
for (const f of files) {
  const T = fs.readFileSync(f, 'utf8');
  if (/⟦|⟧/.test(T)) continue;
  const r = transform(T);
  if (!r.blocks) continue;
  // exact inverse check
  const back = r.out.split('\n'); const res: string[] = [];
  for (let i = 0; i < back.length; i++) {
    const mm = /^⟦1([.)])\+(\d+)⟧$/.exec(back[i]);
    if (mm) { const n = Number(mm[2]); for (let k = 0; k < n; k++) res.push(`${k + 1}${mm[1]} ${back[i + 1 + k]}`); i += n; }
    else res.push(back[i]);
  }
  const exact = res.join('\n') === T;
  const a = countTokens(T, 'o200k_base'), b = countTokens(r.out, 'o200k_base');
  tin += a; tout += b; rows.push(`${b - a}\t${a}\t${r.blocks}\t${r.items}\texact=${exact}\t${f}`);
}
console.log(rows.join('\n'));
console.log(JSON.stringify({ files: rows.length, totIn: tin, totOut: tout, delta: tout - tin, pct: +(100 * (tout - tin) / tin).toFixed(3) }));
