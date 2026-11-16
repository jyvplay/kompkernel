/** X123 ΠΛΑΤΟΣ token probe.
 *
 * For every lane that `bench/x123/depad.py` fitted, price three texts with the
 * SHIPPED frontier (tagstackFrontier, the X73/X74 identity — not a stripped
 * encoder):
 *   .orig   untouched
 *   .depad  record block de-padded, fields joined by one space
 *   .del    de-padded with every constant column deleted
 *
 * The gap between `.orig` and `.del` is the gross headroom a column-width
 * side-stream can reach; the header it costs has to come out of it.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier, tagstackMemoClear } from '../../src/lib/omega/tagstack';

const DIR = '/tmp/platos';
const lanes = JSON.parse(fs.readFileSync('bench/x123/receipts/depad.json', 'utf8')) as any[];

const enc = 'o200k_base' as const;
const rows: any[] = [];
for (const m of lanes) {
  const base = m.lane;
  const read = (ext: string) => fs.readFileSync(`${DIR}/${base}${ext}`, 'utf8');
  const orig = read('.orig');
  const depad = read('.depad');
  const del = read('.del');
  tagstackMemoClear();
  const t0 = Date.now();
  const rOrig = tagstackFrontier(orig, enc);
  const msOrig = Date.now() - t0;
  tagstackMemoClear();
  const rDepad = tagstackFrontier(depad, enc);
  tagstackMemoClear();
  const rDel = tagstackFrontier(del, enc);
  const row = {
    lane: base, rows: m.rows, cols: m.cols, constCols: m.constCols,
    rawOrig: countTokens(orig, enc), rawDel: countTokens(del, enc),
    orig: rOrig.messageTokens, depad: rDepad.messageTokens, del: rDel.messageTokens,
    exact: rOrig.decoded === orig && rDepad.decoded === depad && rDel.decoded === del,
    msOrig,
  };
  rows.push(row);
  console.log(`${base.padEnd(24)} raw ${String(row.rawOrig).padStart(5)} -> orig ${String(row.orig).padStart(5)}` +
    `  depad ${String(row.depad).padStart(5)} (${row.depad - row.orig >= 0 ? '+' : ''}${row.depad - row.orig})` +
    `  del ${String(row.del).padStart(5)} (${row.del - row.orig >= 0 ? '+' : ''}${row.del - row.orig})` +
    `  exact ${row.exact}  ${msOrig}ms`);
  fs.writeFileSync('bench/x123/receipts/platos-probe.jsonl',
    rows.map(r => JSON.stringify(r)).join('\n') + '\n');
}
const s = rows.reduce((a, r) => ({ o: a.o + r.orig, d: a.d + r.depad, x: a.x + r.del }), { o: 0, d: 0, x: 0 });
console.log(`\nΣ orig ${s.o}  depad ${s.d} (${s.d - s.o})  del ${s.x} (${s.x - s.o})`);
