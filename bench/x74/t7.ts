import * as fs from 'node:fs';
import { stoicheionFold } from '../../src/lib/omega/stoicheion';
const p = process.argv[2]; const t = fs.readFileSync(p, 'utf8');
for (const anchor of ['R','L'] as const) for (const skip of [0,1]) {
  const f = stoicheionFold(t, 1, anchor, { skipHeader: skip, outlierQuantile: 1 });
  if (!f) { console.log(`${anchor} skip${skip}: null`); continue; }
  console.log(`${anchor} skip${skip}: widths ${f.widths.join(',')} align ${f.align} rows ${f.table.length}/${f.map.length}`);
  for (let i = 0; i < Math.min(3, f.table.length); i++) console.log('   ' + JSON.stringify(f.table[i]));
  console.log('   lits ' + JSON.stringify(f.literals.slice(0,3)));
}
