/** X74 probe 6: per-column token mass vs per-column program cost, on wide records. */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const ALPHA = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const lines = text.split('\n');
  // dominant field-count across non-empty lines, split on 2+ spaces (keep leading run of first field)
  const counts = new Map<number, number>();
  for (const l of lines) if (l.trim()) { const n = l.trim().split(/ +/).length; counts.set(n, (counts.get(n) ?? 0) + 1); }
  const C = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
  const rows = lines.filter(l => l.trim() && l.trim().split(/ +/).length === C).map(l => l.trim().split(/ +/));
  if (!rows.length) { console.log(`${p}: no uniform rows`); continue; }
  const R = rows.length;
  const raw = T(text, enc);
  const cols: string[][] = Array.from({ length: C }, (_, c) => rows.map(r => r[c]));
  console.log(`\n=== ${p.split('/').pop()}  raw ${raw}  R=${R} C=${C}  (wire-per-row ${(raw / R).toFixed(1)})`);
  let totalLit = 0, totalBest = 0;
  for (let c = 0; c < C; c++) {
    const vals = cols[c];
    const uniq = [...new Set(vals)];
    const litCost = T(vals.join(' '), enc);
    // dictionary cost: alphabet once + one index char per row
    const idx = vals.map(v => ALPHA[uniq.indexOf(v)]).join('');
    const dictCost = T(uniq.join(' '), enc) + T(idx, enc);
    // const
    const constCost = uniq.length === 1 ? T(vals[0], enc) : Infinity;
    let best = Math.min(litCost, dictCost, constCost);
    let kind = best === constCost ? 'const' : best === dictCost ? 'dict' : 'lit';
    // numeric AP check
    if (vals.every(v => /^-?\d+$/.test(v))) {
      const nums = vals.map(Number);
      const steps = new Set<number>();
      for (let i = 1; i < nums.length; i++) steps.add(nums[i] - nums[i - 1]);
      if (steps.size <= 1) {
        const apCost = T(String(nums[0]) + '+' + String([...steps][0] ?? 0) + '*r', enc);
        if (apCost < best) { best = apCost; kind = 'ap'; }
      }
    }
    const idxTokens = T(idx, enc);
    console.log(`  col ${c}: uniq ${String(uniq.length).padStart(3)} lit ${String(litCost).padStart(4)} dict ${String(dictCost).padStart(4)} (alpha ${T(uniq.join(' '), enc)} + idx ${idxTokens}) const ${constCost === Infinity ? '  -' : String(constCost).padStart(4)} -> ${kind} ${best}`);
    totalLit += litCost; totalBest += best;
  }
  console.log(`  SUM literal-column cost ${totalLit}  best-program ${totalBest}  (raw wire ${raw})`);
}
