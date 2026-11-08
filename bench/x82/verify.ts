/** X82 SCHEMA — end-to-end verification against the real codec file.
 *  Reports the frontier (parent) tokens, the SCHEMA one-chat message tokens, and
 *  both round-trip gates: `decoded` (produced by the encoder's own inverse) and
 *  `dec` (produced by schemaDecode on the message alone — i.e. what a reader with
 *  no other information recovers). */
import * as fs from 'node:fs';
import { schemaEncode, schemaDecode } from '../../src/lib/omega/schema';
const enc: any = 'o200k_base';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  let S: string; try { S = fs.readFileSync(p, 'utf8'); } catch { continue; }
  const n = p.split('/').pop()!;
  const r = schemaEncode(S, enc);
  const rt = r.decoded === S;
  const dec = schemaDecode(r.message) === S;
  const d = (r.applied ? r.messageTokens : r.frontierTokens) - r.frontierTokens;
  console.log(`${n.padEnd(24)} F ${String(r.frontierTokens).padStart(5)} -> ${String(r.messageTokens).padStart(5)} ${r.applied ? `(${d >= 0 ? '+' : ''}${d})` : '      '} applied=${r.applied} rt=${rt} dec=${dec} ${r.applied ? r.shapes!.map((s: any) => `${s.sample}@${s.len}d`).join(' ') : ''}`);
  if (!rt || !dec) console.log(`   !!! ROUND TRIP FAILED  rt=${rt} dec=${dec}`);
  rows.push({ lane: n, F: r.frontierTokens, M: r.messageTokens, delta: d, applied: r.applied, rt, dec, shapes: r.shapes, contract: r.contractTokens, pruned: r.pruned, notes: r.notes });
}
fs.writeFileSync('bench/x82/receipts/schema.json', JSON.stringify(rows, null, 1) + '\n');
const a = rows.filter(r => r.applied);
console.log(`\nAPPLIED ${a.length}/${rows.length}  total delta ${a.reduce((x, r) => x + r.delta, 0)}`);
console.log(`round trip: ${rows.filter(r => r.rt).length}/${rows.length} encoded-inverse, ${rows.filter(r => r.dec).length}/${rows.length} standalone-decode`);
