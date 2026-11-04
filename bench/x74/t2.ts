import * as fs from 'node:fs';
import { stoicheionFold } from '../../src/lib/omega/stoicheion';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  for (const anchor of ['R','L'] as const) for (const tol of [1, 0.95, 0.9, 0.8]) {
    const f = stoicheionFold(t, tol, anchor);
    if (!f) { console.log(`${p.split('/').pop()} ${anchor} tol ${tol}: null`); continue; }
    console.log(`${p.split('/').pop()} ${anchor} tol ${tol}: widths ${f.widths.join(',')} align ${f.align} rows ${f.table.length}/${f.map.length}`);
    if (tol === 0.9) console.log('   row0 ' + JSON.stringify(f.table[0]) + '\n   row1 ' + JSON.stringify(f.table[1]));
  }
}
