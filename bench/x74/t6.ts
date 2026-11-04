import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { stoicheionFold, stoicheionFitColumn } from '../../src/lib/omega/stoicheion';
const enc: any = 'o200k_base';
const p = process.argv[2]; const anchor = process.argv[3] as any; const tol = Number(process.argv[4]); const skip = Number(process.argv[5]);
const t = fs.readFileSync(p, 'utf8');
const fold = stoicheionFold(t, tol, anchor, { skipHeader: skip, outlierQuantile: 1 })!;
console.log(`rows ${fold.table.length}/${fold.map.length} widths ${fold.widths.join(',')} align ${fold.align}`);
for (let c = 0; c < fold.widths.length; c++) {
  const vals = fold.table.map(r => r[c]);
  const cands = stoicheionFitColumn(vals, enc);
  const uniq = new Set(vals).size;
  const litCost = T(vals.join('\n'), enc);
  console.log(`  col ${c} w=${fold.widths[c]} uniq ${uniq} best ${cands[0].kind} ${cands[0].tokens} | as-frontier ${litCost} | kinds ${cands.map(x=>x.kind+':'+x.tokens).join(' ')}`);
  if (cands[0].kind === 'L') console.log(`     L spec head: ${cands[0].spec.slice(0, 160)}`);
}
