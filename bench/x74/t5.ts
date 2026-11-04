import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { stoicheionFold, stoicheionFitColumn } from '../../src/lib/omega/stoicheion';
const enc: any = 'o200k_base';
const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json','utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  let best: any = null;
  for (const anchor of ['R','L'] as const) for (const tol of [1,0.95,0.9,0.8]) for (const skip of [0,1,2,3]) for (const q of [1,0.95,0.9]) {
    const fold = stoicheionFold(t, tol, anchor, { skipHeader: skip, outlierQuantile: q });
    if (!fold) continue;
    const cols = Array.from({length: fold.widths.length}, (_, c) => stoicheionFitColumn(fold.table.map(r=>r[c]), enc)[0]);
    const head = T(`S${fold.table.length}x${fold.widths.length} ${fold.widths.join(',')} ${fold.align}`, enc);
    const colTok = cols.reduce((a,c)=>a+c.tokens,0);
    const litTok = T(fold.literals.join('\n'), enc);
    const total = head + colTok + litTok;
    if (!best || total < best.total) best = { total, tol, anchor, skip, q, rows: fold.table.length, of: fold.map.length, kinds: cols.map(c=>c.kind).join(''), colTok, litTok, head, align: fold.align, widths: fold.widths };
  }
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(T(t,enc)).padStart(4)} frontier ${String(F.get(p)).padStart(4)} | body ${String(best?.total).padStart(4)} ${best?`tol${best.tol}/${best.anchor}/skip${best.skip}/q${best.q} rows ${best.rows}/${best.of} cols ${best.kinds} head ${best.head} lit ${best.litTok}`:'NOFOLD'}`);
}
