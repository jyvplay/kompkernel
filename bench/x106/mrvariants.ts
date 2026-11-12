/**
 * X106 — ΜΕΓΑΛΥΤΕΡΗ-ΕΠΑΝΑΛΗΨΙΣ AS A ΧΕΙΡΩΝ SWEEP DIMENSION.
 *
 * The isolated A/B (bench/x104/receipts/megaepanalipsis.log) forces the MR-order
 * window on every lane and measures +13 tokens over 15 lanes, so the order is
 * NOT globally better.  This probe tests the only form in which it can still be
 * a Pareto improvement: ΧΕΙΡΩΝ already runs a variant sweep and keeps the
 * cheapest variant, so adding `full-mr/<sep>` beside `full/<sep>` can only take
 * the lanes where MR-order wins and keep the shipped answer everywhere else.
 *
 * The cost is real and is measured here, not assumed: the extra variant draws on
 * the SAME shared work meter (CHIRON_MAX_TOTAL_WORK_UNITS), so every variant
 * gets less work than before.  A variant that wins 3 tokens while starving the
 * sweep into losing 6 is not a win, and this probe is what tells the two apart.
 *
 * Arms, interleaved in one process, score = token count + SHA-256 of the wire:
 *   off  chironEncode(text, enc, {})                      — the shipped sweep
 *   on   chironEncode(text, enc, {mrOrderVariants: true}) — sweep + the MR variant
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { chironEncode, chironDecode } from '../../src/lib/omega/chiron';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0';
const enc: any = 'o200k_base';
const WANT = (process.env.X105_LANES ?? 'lsblk,kb-article,uptime-w,free-m,vmstat,markdown-table,prices,node-help,code-ts,dpkg-l,apt-real,ls-l-real,ps-aux-real,findmnt,unified-diff,json-pkg,psql-output,email-thread,metrics,du-real,df-real,ps-real,ps-ef,ls-real,kubectl').split(',');
const ALL = fs.readFileSync('/tmp/lanes.txt', 'utf8').split('\n').filter(Boolean);
const lanes = ALL.filter(p => WANT.some(w => p.includes(w)));
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
for (const warm of [false, true]) {
  chironEncode(fs.readFileSync('bench/holdout-work/kb-article.txt', 'utf8'), enc, { mrOrderVariants: warm });
}
const out = fs.createWriteStream('bench/x104/receipts/mrvariants.log', { flags: 'w' });
out.write('lane\tarm\ttokens\tbytes\texact\tsha\tms\n');
let tot = { off: 0, on: 0 }, exact = { off: 0, on: 0 }, ms = { off: 0, on: 0 }, n = 0;
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const name = p.split('/').pop()!;
  const row: any = {};
  for (const arm of ['off', 'on'] as const) {
    const t1 = Date.now();
    const r: any = chironEncode(text, enc, { mrOrderVariants: arm === 'on' });
    const dt = Date.now() - t1;
    const ok = chironDecode(r.wire) === text;
    row[arm] = { tokens: r.messageTokens, bytes: r.wire.length, sha: sha(r.wire), ms: dt, ok, rules: r.rules };
    if (ok) exact[arm]++; else console.log(`INEXACT ${name} ${arm}`);
    ms[arm] += dt;
  }
  n++;
  tot.off += row.off.tokens; tot.on += row.on.tokens;
  const d = row.on.tokens - row.off.tokens;
  out.write(`${name}\toff\t${row.off.tokens}\t${row.off.bytes}\t${row.off.ok}\t${row.off.sha.slice(0, 12)}\t${row.off.ms}\n`);
  out.write(`${name}\ton\t${row.on.tokens}\t${row.on.bytes}\t${row.on.ok}\t${row.on.sha.slice(0, 12)}\t${row.on.ms}\n`);
  console.log(`${name.padEnd(22)} off ${String(row.off.tokens).padStart(5)}  on ${String(row.on.tokens).padStart(5)}  Δ ${d > 0 ? '+' : ''}${String(d).padStart(4)}  rules ${row.off.rules}/${row.on.rules}  exact ${row.off.ok}/${row.on.ok}  shaSame=${row.off.sha === row.on.sha}  ms ${row.off.ms}/${row.on.ms}`);
}
out.write(`TOTAL\t\toff ${tot.off}\ton ${tot.on}\tΔ ${tot.on - tot.off}\texact ${exact.off}/${n} vs ${exact.on}/${n}\tms ${ms.off}/${ms.on}\n`);
out.end();
console.log(`\n${n} lanes: off ${tot.off} -> on ${tot.on}   Δ ${tot.on - tot.off}   exact off ${exact.off}/${n} on ${exact.on}/${n}   ms off ${ms.off} on ${ms.on} (${(100 * (ms.on - ms.off) / Math.max(1, ms.off)).toFixed(1)}%)`);
fs.writeFileSync('bench/x104/receipts/mrvariants.json',
  JSON.stringify({ lanes: n, off: tot.off, on: tot.on, delta: tot.on - tot.off, exactOff: exact.off, exactOn: exact.on, msOff: ms.off, msOn: ms.on }, null, 1) + '\n');
