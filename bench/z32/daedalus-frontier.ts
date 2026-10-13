// Z32: DAEDALUS (registry, on main) one-chat message tokens on the lane groups and the fresh corpus.
// Metric = messageTokens (wire + contract, o200k). Writes one JSON line per doc. Output is wall-clock
// bounded by DAEDALUS itself (budgetMs), so each record also reports the elapsed time.
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
const rows: [string, string][] = [];
for (const l of fs.readFileSync('/home/user/z31/groups-list.tsv', 'utf8').split('\n').filter(Boolean)) { const [g, f] = l.split('\t'); rows.push([g, f.startsWith('/') ? f : '/home/user/kompkernel/' + f]); }
for (const l of fs.readFileSync('/home/user/z31/fresh-list.tsv', 'utf8').split('\n').filter(Boolean)) { const [, f] = l.split('\t'); rows.push(['fresh', f]); }
const out = process.argv[2];
const START = Number(process.env.START ?? 0);
if (START === 0) fs.writeFileSync(out, '');
for (const [g, f] of rows.slice(START)) {
  const t = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = daedalusEncode(t, 'o200k_base');
  const ms = Date.now() - t0;
  fs.appendFileSync(out, JSON.stringify({ group: g, file: f, inTokens: r.inTokens, outTokens: r.outTokens, messageTokens: r.messageTokens, contract: r.messageTokens - r.outTokens, exact: r.decoded === t, ms, winningArm: r.winningArm }) + '\n');
}
console.log('done', rows.length);
