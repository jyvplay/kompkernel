import * as fs from 'node:fs';
import { tagstackFrontier, tagstackEncode } from '../../src/lib/omega/tagstack';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8'); const t0 = Date.now();
  const f: any = tagstackFrontier(S, enc);
  let e: any = null; try { e = tagstackEncode(S, enc); } catch {}
  rows.push({ path: p, lane: p.split('/').pop(), raw: countTokens(S, enc), F: f.messageTokens, parent: f.parentCodec,
    exact: f.decoded === S, encode: e?.messageTokens ?? null, encodeExact: e ? e.decoded === S : null, secs: +((Date.now()-t0)/1000).toFixed(1) });
  const r = rows[rows.length-1];
  console.log(`${r.lane.padEnd(28)} raw=${String(r.raw).padStart(6)} F=${String(r.F).padStart(6)} parent=${r.parent} exact=${r.exact} encode(base+X74)=${r.encode} ${r.secs}s`);
  fs.mkdirSync('bench/x88/receipts', { recursive: true });
  fs.writeFileSync('bench/x88/receipts/logfront.json', JSON.stringify({ rows }, null, 1) + '\n');
  fs.writeFileSync('bench/x88/receipts/' + r.lane + '.wire.txt', f.message, 'utf8');
}
