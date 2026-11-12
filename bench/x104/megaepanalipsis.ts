/**
 * X105 — ΜΕΓΑΛΥΤΕΡΗ-ΕΠΑΝΑΛΗΨΙΣ (MR-order) A/B on ΧΕΙΡΩΝ directly, because the
 * mechanism lives inside ΧΕΙΡΩΝ's macro loop and a chain-level A/B would
 * confound it with every other gate.
 *
 * Arms, interleaved in one process so wall clock is comparable:
 *   off  chironEncode(text, enc, {})            — the shipped positional window
 *   on   chironEncode(text, enc, {mrOrder:true}) — head-of-ranking window with a dead set
 *
 * Score is the SHA-256 of the complete emitted message plus the token count,
 * because two different wires can share a token count and only one of them is
 * the better artifact.
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { chironEncode, chironDecode } from '../../src/lib/omega/chiron';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0';
const enc: any = 'o200k_base';
// X105 — the starvation test. ΧΕΙΡΩΝ is meter-gated (the shared meter is 96 %
// exhausted on ls-l-real, 75 % on ps-aux-real, 73 % on code-ts,
// bench/x101/klimax29.json), so a mechanism that applies more rules per epoch
// can look worse purely because it runs out of meter sooner. X105_WORK scales
// the deterministic budget for BOTH arms identically, so the comparison at
// several scales separates "starved" from "genuinely worse".
const WORK = Number(process.env.X105_WORK ?? '0') || undefined;
const ALL = fs.readFileSync('/tmp/lanes.txt', 'utf8').split('\n').filter(Boolean);
const WANT = (process.env.X105_LANES ?? 'lsblk,kb-article,uptime-w,free-m,vmstat,markdown-table,prices,node-help,code-ts,dpkg-l,apt-real,ls-l-real,ps-aux-real,findmnt,unified-diff').split(',');
const lanes = ALL.filter(p => WANT.some(w => p.includes(w)));
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

// warm up both paths so neither arm pays first-call JIT and glyph-pool setup
for (const warm of [false, true]) {
  chironEncode(fs.readFileSync('bench/holdout-work/kb-article.txt', 'utf8'), enc, { mrOrder: warm });
}

const out = fs.createWriteStream('bench/x104/receipts/megaepanalipsis.log', { flags: 'w' });
out.write(`lane\tarm\ttokens\tbytes\texact\tsha\tms\twork\n`);
out.write(`# workUnits=${WORK ?? 'default'}\n`);
let tot = { off: 0, on: 0 }, exact = { off: 0, on: 0 }, n = 0;
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const name = p.split('/').pop()!;
  const row: any = {};
  for (const arm of ['off', 'on'] as const) {
    const t1 = Date.now();
    const r: any = chironEncode(text, enc, { mrOrder: arm === 'on', ...(WORK ? { workUnits: WORK } : {}) });
    const ms = Date.now() - t1;
    const ok = chironDecode(r.wire) === text;
    row[arm] = { tokens: r.messageTokens, bytes: r.wire.length, sha: sha(r.message ?? r.wire), ms, ok, rules: r.rules, mode: r.mode };
    if (ok) exact[arm]++; else console.log(`INEXACT ${name} ${arm}`);
  }
  n++;
  tot.off += row.off.tokens; tot.on += row.on.tokens;
  const d = row.on.tokens - row.off.tokens;
  out.write(`${name}\toff\t${row.off.tokens}\t${row.off.bytes}\t${row.off.ok}\t${row.off.sha.slice(0, 12)}\t${row.off.ms}\t${WORK ?? 'def'}\n`);
  out.write(`${name}\ton\t${row.on.tokens}\t${row.on.bytes}\t${row.on.ok}\t${row.on.sha.slice(0, 12)}\t${row.on.ms}\t${WORK ?? 'def'}\n`);
  console.log(`${name.padEnd(22)} [w=${WORK ?? 'def'}] off ${String(row.off.tokens).padStart(5)}  on ${String(row.on.tokens).padStart(5)}  Δ ${d > 0 ? '+' : ''}${String(d).padStart(4)}  bytes ${row.off.bytes}→${row.on.bytes}  rules ${row.off.rules}/${row.on.rules}  exact ${row.off.ok}/${row.on.ok}  shaSame=${row.off.sha === row.on.sha}  rules ${row.off.rules}/${row.on.rules}  mode ${row.off.mode}/${row.on.mode}  ms ${row.off.ms}/${row.on.ms}`);
}
out.write(`TOTAL\t\toff ${tot.off}\ton ${tot.on}\tΔ ${tot.on - tot.off}\texact ${exact.off}/${n} vs ${exact.on}/${n}\n`);
out.end();
console.log(`\n${n} lanes: off ${tot.off} -> on ${tot.on}   Δ ${tot.on - tot.off}   exact off ${exact.off}/${n} on ${exact.on}/${n}`);
fs.writeFileSync('bench/x104/receipts/megaepanalipsis.json',
  JSON.stringify({ lanes: n, off: tot.off, on: tot.on, delta: tot.on - tot.off, exactOff: exact.off, exactOn: exact.on }, null, 1) + '\n');
