/** X74 prototype 3: column-major stream, high-cardinality columns handed to the
 *  frontier verbatim (the frontier's own scanner sees a column as a document). */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { stoicheionFold, stoicheionFitColumn } from '../../src/lib/omega/stoicheion';
const enc: any = 'o200k_base';
const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json','utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const raw = T(t, enc);
  const f = F.get(p) ?? 0;
  const out: string[] = [];
  for (const tol of [1, 0.95, 0.9, 0.8]) {
    const fold = stoicheionFold(t, tol);
    if (!fold) continue;
    let colTok = 0, friTok = 0; const kinds: string[] = [];
    for (let c = 0; c < fold.widths.length; c++) {
      const vals = fold.table.map(r => r[c]);
      const best = stoicheionFitColumn(vals, enc)[0];
      if (best.kind === 'L') {
        // hand the column's values, one per line, to the frontier
        const sub = tagstackEncode(vals.join('\n'), enc);
        friTok += sub.messageTokens; kinds.push('F');
      } else { colTok += best.tokens; kinds.push(best.kind); }
    }
    const litTok = T(fold.literals.join('\n'), enc);
    const head = T(`S${fold.table.length}x${fold.widths.length} ${fold.widths.join(',')} ${fold.align}`, enc);
    const colsTok = T(fold.align.length ? '' : '', enc);
    const total = head + colTok + friTok + litTok + colsTok;
    out.push(`tol ${tol}: cols ${colTok} frontier ${friTok} lits ${litTok} head ${head} = ${total} (kinds ${kinds.join('')} rows ${fold.table.length}/${fold.map.length})`);
  }
  console.log(`${p.split('/').pop()!.padEnd(24)} raw ${String(raw).padStart(4)} frontier ${String(f).padStart(4)} | ${out[0] ?? 'NOFOLD'}`);
  for (const o of out.slice(1)) console.log(' '.repeat(24) + ' | ' + o);
}
