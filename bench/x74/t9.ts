/** t9: the PAD arm — fold to TSV, run the FRONTIER on the normal form, charge the key honestly. */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { stoicheionCandidates, stoicheionFoldAt } from '../../src/lib/omega/stoicheion';
const enc: any = 'o200k_base';
const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json','utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));
const KEY = (w: string, a: string) => `Expand TSV body then re-pad: cells ${w}, marks ${a}. ; >=pad left, <=pad right, .=last raw; \\lines literal. Print only.`;
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const F0 = F.get(p) ?? null;
  let best: any = null;
  for (const tol of [1,0.95,0.9,0.8]) for (const skip of [0,1,2,3]) for (const q of [1,0.95]) {
    const cs = stoicheionCandidates(t, tol, { skipHeader: skip, outlierQuantile: q });
    if (!cs) continue;
    const f = stoicheionFoldAt(t, cs);
    if (!f) continue;
    const tsv = [...f.table.map(r=>r.join('\t'))];
    // rebuild the source order using the map
    const out: string[] = []; let li = 0, ri = 0;
    for (const s of f.map) { if (s === 'x') out.push('\\' + f.literals[li++]); else out.push(tsv[ri++]); }
    const normal = out.join('\n');
    if (!best || normal.length < best.normal.length) best = { f, normal };
  }
  if (!best) { console.log(`${p.split('/').pop()!.padEnd(22)} NOFOLD`); continue; }
  const body = tagstackEncode(best.normal, enc);
  const key = KEY(best.f.widths.join(','), best.f.align);
  const msg = key + '\n' + body.message;
  const total = T(msg, enc);
  const row = { path: p, raw: T(t, enc), frontier: F0, pad: total, key: T(key, enc), bodyFrontier: body.messageTokens, parent: body.parentCodec, rows: best.f.table.length, of: best.f.map.length };
  rows.push(row);
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(row.raw).padStart(4)} frontier ${String(F0).padStart(4)} | pad ${String(total).padStart(4)} = key ${String(row.key).padStart(3)} + ${String(body.messageTokens).padStart(4)}(${body.parentCodec})  delta ${F0?String(total-F0).padStart(5):'    ?'} rows ${row.rows}/${row.of}`);
  fs.writeFileSync('bench/x74/pad.json', JSON.stringify(rows, null, 1));
}
