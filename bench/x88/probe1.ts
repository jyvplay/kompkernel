/** X88 probe 1 — three cheap questions that decide the design.
 *  (a) what does the frontier's own WIRE ALPHABET cost per glyph?
 *  (b) `tagstackEncode` = base + the X74 candidate chain, never measured per docs.
 *  (c) apt-real's constant infix `/now` and constant suffix `[installed,local]`. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier, tagstackEncode, tagstackX74Chain } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';

console.log('=== (a) wire alphabet cost, o200k ===');
const glyphs = ['⟨','⟩','¦','␟','‖','⁞','·','‡','*','§','×','~','#','@','¤','a','z','0','9','\n',' ','\t','|'];
for (const g of glyphs) {
  const alone = countTokens(g, enc);
  const run5 = countTokens(g.repeat(5), enc);
  const inCtx = countTokens('foo' + g + 'bar', enc);
  console.log(`  ${JSON.stringify(g).padEnd(12)} alone=${alone}  x5=${run5} (${(run5/5).toFixed(2)}/glyph)  in 'foo?bar'=${inCtx}`);
}
const wireSample = '⟨5¦L0t:/dev/nvme0n1p0/0,0,1¦L17t:100G/37¦R27t:40G/11¦R33t:50G/9¦L35t:30% /mnt/vol0/3,1¦pL1R18L1⟩¦s';
console.log(`  ΚΕΝΟΝ header sample: ${countTokens(wireSample, enc)} tok / ${wireSample.length} chars`);
const asciiSame = 'Grid 5 | L0 t:/dev/nvme0n1p0/0,0,1 | L17 t:100G/37 | R27 t:40G/11 | R33 t:50G/9 | L35 t:30% /mnt/vol0/3,1 | pL1R18L1 | s';
console.log(`  ASCII-spelled same:    ${countTokens(asciiSame, enc)} tok / ${asciiSame.length} chars`);

console.log('\n=== (b) tagstackEncode (base + X74 chain) vs tagstackFrontier ===');
const F: Record<string, number> = { 'lsblk.txt':60,'uptime-w.txt':80,'free-m.txt':76,'vmstat.txt':149,'df-real.txt':126,
  'markdown-table.md':176,'prices.csv':133,'cue-sheet.md':163,'psql-output.txt':244,'metrics.tsv':210,'du-real.txt':272,
  'ps-ef.txt':315,'unified-diff.patch':419,'ls-real.txt':433,'df-h.txt':108 };
const lanes = ['bench/holdout-x42/lsblk.txt','bench/holdout-x42b/uptime-w.txt','bench/holdout-x42b/free-m.txt',
  'bench/holdout-x42b/vmstat.txt','bench/holdout-x41/df-real.txt','bench/holdout-tbl/markdown-table.md',
  'bench/holdout-x40/prices.csv','bench/holdout-x40/cue-sheet.md','bench/holdout-tbl/psql-output.txt',
  'bench/holdout-x40/metrics.tsv','bench/holdout-x41/du-real.txt','bench/holdout-x42/ps-ef.txt',
  'bench/holdout-work/unified-diff.patch','bench/holdout-x41/ls-real.txt','bench/holdout-x42/df-h.txt'];
let tf = 0, te = 0, wins = 0;
const rows: any[] = [];
for (const p of lanes) {
  const S = fs.readFileSync(p, 'utf8'); const name = p.split('/').pop()!;
  const t0 = Date.now();
  const f = tagstackFrontier(S, enc);
  const e = tagstackEncode(S, enc);
  const c = tagstackX74Chain(S, enc);
  tf += f.messageTokens; te += e.messageTokens; if (e.messageTokens < f.messageTokens) wins++;
  rows.push({ lane: name, receiptF: F[name] ?? null, frontier: f.messageTokens, encode: e.messageTokens, chain: c.messageTokens, exact: f.decoded===S&&e.decoded===S&&c.decoded===S });
  console.log(`  ${name.padEnd(22)} receiptF=${String(F[name] ?? '?').padStart(5)} frontier=${String(f.messageTokens).padStart(5)} encode=${String(e.messageTokens).padStart(5)} chainOnly=${String(c.messageTokens).padStart(5)} exact=${rows[rows.length-1].exact} ${((Date.now()-t0)/1000).toFixed(1)}s`);
  fs.writeFileSync('bench/x88/receipts/probe1.json', JSON.stringify({ rows, totals: { frontier: tf, encode: te, wins } }, null, 1) + '\n');
}
console.log(`  TOTALS frontier=${tf} encode=${te} delta=${te-tf} encode-better-on ${wins}/${lanes.length}`);

console.log('\n=== (c) apt-real constant fields, gross raw saving ===');
const apt = fs.readFileSync('bench/holdout-x41/apt-real.txt', 'utf8');
const lines = apt.split('\n');
const body = lines.filter(l => l.includes('/now ') || l.includes('/ '));
const raw = countTokens(apt, enc);
const STAT = / \[(installed|installed,local|installed,automatic|installed,upgradable)\]/g;
const noNow = apt.replace(/\/now /g, ' ');
const noStatus = apt.replace(STAT, '');
const both = noNow.replace(STAT, '');
console.log(`  lines=${lines.length} pkg lines=${body.length} raw=${raw}`);
console.log(`  without '/now '          = ${countTokens(noNow, enc)}  (gross -${raw - countTokens(noNow, enc)})`);
console.log(`  without '[installed..]'  = ${countTokens(noStatus, enc)}  (gross -${raw - countTokens(noStatus, enc)})`);
console.log(`  without both             = ${countTokens(both, enc)}  (gross -${raw - countTokens(both, enc)})`);
console.log(`  distinct status suffixes: ${JSON.stringify([...new Set(body.map(l => (l.match(/ \[[^\]]*\]$/) ?? [''])[0]))])}`);
console.log(`  distinct arch column: ${JSON.stringify([...new Set(body.map(l => l.split(' ')[2]))].slice(0,8))}`);
console.log(`  '/now' occurrences: ${(apt.match(/\/now /g) ?? []).length}`);
