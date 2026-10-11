// z11: TABLE-T1 vs AMPHORA on real JSON arrays. delivered = TABLE's one-chat tokens (contract + wire, or raw).
import fs from 'node:fs';
import { tableEncode, tableDecode } from '@/lib/omega/table';
import { amphoraEncode } from '@/lib/omega/amphora';
const files = (process.env.LIST || '').split(',').filter(Boolean);
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const r = tableEncode(t, 'o200k_base');
  const ok = tableDecode(r.wire) === t;
  const a = amphoraEncode(t, 'o200k_base');
  console.log(JSON.stringify({ f, in: r.inTokens, table: r.deliveredTokens, tableMode: r.mode, tableExact: r.exact && ok, tableRows: r.rows, amph: a.messageTokens, amphWinner: a.winner, amphExact: a.exact && a.decoded === t }));
}
