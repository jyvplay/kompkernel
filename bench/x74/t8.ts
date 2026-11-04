/** t8: compare frontiers on three views of the same bytes:
 *  row-major source, row-major TSV normal form, column-major TSV stream. */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { stoicheionCandidates, stoicheionFoldAt } from '../../src/lib/omega/stoicheion';
const enc: any = 'o200k_base';
const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json','utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const F0 = F.get(p);
  // best fold for coverage
  let best: any = null;
  for (const tol of [1,0.95,0.9,0.8]) for (const skip of [0,1,2,3]) {
    const cs = stoicheionCandidates(t, tol, { skipHeader: skip, outlierQuantile: 1 });
    if (!cs) continue;
    const f = stoicheionFoldAt(t, cs);
    if (!f) continue;
    if (!best || f.table.length > best.table.length) best = f;
  }
  if (!best) { console.log(`${p.split('/').pop()!.padEnd(22)} NOFOLD`); continue; }
  const rows: string[][] = best.table;
  const C = rows[0].length;
  const tsv = rows.map(r=>r.join('\t')).join('\n');
  // column-major: one column per line, cells joined by TAB
  const cmajor = Array.from({length:C},(_,c)=>rows.map(r=>r[c]).join('\t')).join('\n');
  const r1 = tagstackEncode(tsv, enc), r2 = tagstackEncode(cmajor, enc);
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(T(t,enc)).padStart(5)} frontier ${String(F0).padStart(5)} | tsv ${String(T(tsv,enc)).padStart(4)} -> F ${String(r1.messageTokens).padStart(4)} | cmaj ${String(T(cmajor,enc)).padStart(4)} -> F ${String(r2.messageTokens).padStart(4)} | rows ${rows.length}/${best.map.length} C=${C}`);
}
