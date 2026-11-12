/**
 * X106 — ΤΥΠΟΣ'S `exactAccept`, THE FLAG THAT WAS BUILT AND NEVER SWITCHED ON.
 *
 * ΧΕΙΡΩΝ's macro accept test (chiron.ts:1455) prices
 *
 *     opts.exactAccept ? renderWire(rules, body, glyphOf, ctx)
 *                      : provisionalWire(rules, body, glyphOf)
 *
 * and accepts the candidate if that price beats the running best.  `renderWire`
 * re-derives a topological order and a fresh glyph assignment from ctx.pool and
 * THAT is the string the caller receives; `provisionalWire` is the creation-order
 * string with the search-time assignment.  ΤΥΠΟΣ's own comment records that the
 * two differ in price — ΜΕΤΑΤΑΞΙΣ measured -44 tokens from relocation alone and
 * ΔΙΑΛΕΚΤΟΣ measured +56..+247 from the letter assignment alone.
 *
 * `exactAccept` is an OPTION, and a grep of src/lib/omega shows that NOTHING in
 * the chain ever passes it: `const exactAccept = !!options.exactAccept` is false
 * on every path.  So for the entire life of this stack ΧΕΙΡΩΝ has been accepting
 * macro candidates on one string and shipping a different one, i.e. optimising a
 * proxy for the objective.  This probe A/Bs the flag on ΧΕΙΡΩΝ directly, where
 * the mechanism lives.
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { chironEncode, chironDecode } from '../../src/lib/omega/chiron';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0';
const enc: any = 'o200k_base';
const ALL = fs.readFileSync('/tmp/lanes.txt', 'utf8').split('\n').filter(Boolean);
const WANT = (process.env.X106_LANES ?? 'vmstat,markdown-table,psql-output,email-thread,du-real,findmnt,prices,unified-diff,df-real,ps-real,metrics,kubectl,ls-real,node-help,llm-answer,code-ts,dpkg-l,apt-real,ps-aux-real,ls-l-real').split(',');
const lanes = ALL.filter(p => WANT.some(w => p.includes(w)));
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
for (const warm of [false, true]) {
  chironEncode(fs.readFileSync('bench/holdout-work/kb-article.txt', 'utf8'), enc, { exactAccept: warm });
}
const f = fs.openSync('bench/x104/receipts/exactaccept.log', 'w');
fs.writeSync(f, 'lane\tarm\ttokens\tbytes\texact\tsha\tms\n');
let tot = { off: 0, on: 0 }, exact = { off: 0, on: 0 }, ms = { off: 0, on: 0 }, n = 0, diff = 0;
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const name = p.split('/').pop()!;
  const row: any = {};
  for (const arm of ['off', 'on'] as const) {
    const t1 = Date.now();
    const r: any = chironEncode(text, enc, { exactAccept: arm === 'on' });
    const dt = Date.now() - t1;
    const ok = chironDecode(r.wire) === text;
    row[arm] = { tokens: r.messageTokens, bytes: r.wire.length, sha: sha(r.wire), ms: dt, ok, rules: r.rules };
    if (ok) exact[arm]++; else console.log(`INEXACT ${name} ${arm}`);
    ms[arm] += dt;
  }
  n++;
  tot.off += row.off.tokens; tot.on += row.on.tokens;
  if (row.off.sha !== row.on.sha) diff++;
  const d = row.on.tokens - row.off.tokens;
  fs.writeSync(f, `${name}\toff\t${row.off.tokens}\t${row.off.bytes}\t${row.off.ok}\t${row.off.sha.slice(0, 12)}\t${row.off.ms}\n`);
  fs.writeSync(f, `${name}\ton\t${row.on.tokens}\t${row.on.bytes}\t${row.on.ok}\t${row.on.sha.slice(0, 12)}\t${row.on.ms}\n`);
  console.log(`${name.padEnd(22)} off ${String(row.off.tokens).padStart(5)}  on ${String(row.on.tokens).padStart(5)}  D ${d > 0 ? '+' : ''}${String(d).padStart(4)}  rules ${row.off.rules}/${row.on.rules}  exact ${row.off.ok}/${row.on.ok}  shaSame=${row.off.sha === row.on.sha}  ms ${row.off.ms}/${row.on.ms}`);
}
fs.writeSync(f, `TOTAL\t\toff ${tot.off}\ton ${tot.on}\tD ${tot.on - tot.off}\texact ${exact.off}/${n} vs ${exact.on}/${n}\tms ${ms.off}/${ms.on}\n`);
fs.closeSync(f);
console.log(`\n${n} lanes: off ${tot.off} -> on ${tot.on}   DELTA ${tot.on - tot.off}   exact off ${exact.off}/${n} on ${exact.on}/${n}   shaChanged ${diff}/${n}   ms off ${ms.off} on ${ms.on} (${(100 * (ms.on - ms.off) / Math.max(1, ms.off)).toFixed(1)}%)`);
fs.writeFileSync('bench/x104/receipts/exactaccept.json',
  JSON.stringify({ lanes: n, off: tot.off, on: tot.on, delta: tot.on - tot.off, exactOff: exact.off, exactOn: exact.on, msOff: ms.off, msOn: ms.on, shaChanged: diff }, null, 1) + '\n');
