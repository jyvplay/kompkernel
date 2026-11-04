/** t10: is the width vector DERIVABLE from the cells alone? (then the key is free) */
import * as fs from 'node:fs';
import { stoicheionCandidates, stoicheionFoldAt } from '../../src/lib/omega/stoicheion';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  let best: any = null;
  for (const tol of [1,0.95,0.9,0.8]) for (const skip of [0,1,2,3]) {
    const cs = stoicheionCandidates(t, tol, { skipHeader: skip, outlierQuantile: 1 });
    if (!cs) continue;
    const f = stoicheionFoldAt(t, cs);
    if (!f) continue;
    if (!best || f.table.length > best.table.length) best = f;
  }
  if (!best) { console.log(`${p.split('/').pop()} NOFOLD`); continue; }
  const f = best;
  const C = f.widths.length;
  const maxlen = Array.from({length:C},(_,c)=>Math.max(...f.table.map(r=>r[c].length)));
  const d1 = maxlen.map(x=>x+1);
  const derivable = f.widths.slice(0,-1).every((w,c)=>w === d1[c]);
  console.log(`${p.split('/').pop()!.padEnd(22)} widths ${f.widths.join(',')} align ${f.align} max+1 ${d1.slice(0,-1).join(',')} derivable ${derivable} (needs ${f.widths.slice(0,-1).filter((w,c)=>w!==d1[c]).length} exceptions)`);
}
