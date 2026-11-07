/** X81 — "letter SPACE digit" -> "letterdigit", restored by "put the space back".
 *  LOSSLESS only under G1: the source must contain no letter-digit adjacency of its own,
 *  otherwise the reader cannot tell an inserted pair from an original one. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const CONTRACT = '§X81 put a space back between every letter and the digit that follows it';
const transform = (S: string) => S.replace(/(\p{L}) (?=\p{N})/gu, '$1');
const decode = (S: string) => S.replace(/(\p{L})(\p{N})/gu, '$1 $2');
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const n = (S.match(/(\p{L}) (?=\p{N})/gu) ?? []).length;
  const bad = (S.match(/\p{L}\p{N}/gu) ?? []).length;   // G1 violations
  const base: any = tagstackFrontier(S, enc);
  if (n === 0) { console.log(`${p.split('/').pop()!.padEnd(22)} F ${String(base.messageTokens).padStart(4)} | sites ${String(n).padStart(4)} adj ${String(bad).padStart(4)} | no sites`); continue; }
  const t = transform(S);
  const rt = decode(t) === S;
  const f: any = tagstackFrontier(CONTRACT + '\n' + t, enc);
  const d = f.messageTokens - base.messageTokens;
  rows.push({ lane: p.split('/').pop(), F: base.messageTokens, sites: n, adj: bad, rt, after: f.messageTokens, d });
  console.log(`${p.split('/').pop()!.padEnd(22)} F ${String(base.messageTokens).padStart(4)} | sites ${String(n).padStart(4)} adj ${String(bad).padStart(4)} rt=${rt} | ${rt ? (d >= 0 ? '+' : '') + d : 'SKIP(g1)'}`);
  fs.writeFileSync('bench/x81/receipts/space.json', JSON.stringify(rows, null, 1) + '\n');
}
const okr = rows.filter((r) => r.rt);
console.log(`\nround-trip-clean ${okr.length}/${rows.length} | clean wins ${okr.filter((r) => r.d < 0).length} | total ${okr.reduce((a, r) => a + Math.min(0, r.d), 0)}`);
