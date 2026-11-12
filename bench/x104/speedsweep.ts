/**
 * X105 — HONEST SPEED SWEEP OF ΧΕΙΡΩΝ's WORK METER.
 *
 * ΧΕΙΡΩΝ's meter binds at 100 % of its allowance on every lane in every setting
 * measured, INCLUDING at 8x (bench/x89/receipts/rebalance.json). A meter that is
 * saturated and insensitive is an over-allocated one, so cutting it should cost
 * zero tokens and return time. This sweeps OMEGA_CHIRON_WORK_SCALE over the large
 * lanes, INTERLEAVED in one process (cross-process drift on this box is ~1.6x,
 * which is what made earlier runs look like speedups), and scores on the SHA-256
 * of the COMPLETE message, because two different wires can share a token count.
 *
 * A setting that changes any message hash is reported as changing it, whatever
 * its token count does.
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0'; process.env.OMEGA_OURA_MEMO = '0';
const enc: any = 'o200k_base';
const lanes = fs.readFileSync('/tmp/lanes.txt', 'utf8').split('\n').filter(Boolean)
  .filter(p => /ls-l-real|ps-aux-real|dpkg-l|code-ts|apt-real|node-help|ls-real|json-pkg/.test(p));
const SCALES = (process.env.X105_SCALES ?? '1,0.5,0.25,0.125').split(',');
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

interface Row { path: string; tokens: number; exact: boolean; msgSha: string; ms: number }
const arms: Record<string, Row[]> = {};

// warm-up on a lane outside the swept set
tagstackFrontier(fs.readFileSync('bench/holdout-work/kb-article.txt', 'utf8'), enc);

for (const sc of SCALES) {
  process.env.OMEGA_CHIRON_WORK_SCALE = sc;
  const rows: Row[] = [];
  for (const p of lanes) {
    const text = fs.readFileSync(p, 'utf8');
    const t1 = Date.now();
    const r: any = tagstackFrontier(text, enc);
    rows.push({ path: p, tokens: r.messageTokens, exact: r.decoded === text, msgSha: sha(JSON.stringify(r)), ms: Date.now() - t1 });
  }
  arms[sc] = rows;
  const tot = rows.reduce((a, b) => a + b.tokens, 0);
  const ms = rows.reduce((a, b) => a + b.ms, 0);
  const line = `scale ${sc.padStart(6)}  TOTAL ${String(tot).padStart(6)}  exact ${rows.filter(r => r.exact).length}/${lanes.length}  ms ${String(ms).padStart(7)}`;
  console.log(line);
  fs.appendFileSync('bench/x104/receipts/speedsweep.log', line + '\n');
  for (const r of rows) fs.appendFileSync('bench/x104/receipts/speedsweep.log',
    `  lane\t${sc}\t${r.path.split('/').pop()}\t${r.tokens}\t${r.exact}\t${r.ms}\t${r.msgSha.slice(0, 12)}\n`);
}
const base = arms[SCALES[0]];
console.log('\nlane                       ' + SCALES.map(s => s.padStart(9)).join('') + '   sha-diff vs scale 1');
for (let i = 0; i < lanes.length; i++) {
  const cells = SCALES.map(s => String(arms[s][i].tokens).padStart(9)).join('');
  const diffs = SCALES.filter(s => arms[s][i].msgSha !== base[i].msgSha).length;
  console.log(`${lanes[i].split('/').pop()!.padEnd(26)}${cells}   ${diffs === 0 ? 'identical' : diffs + ' DIFFER'}`);
}
console.log(`\nCPU: ${SCALES.map(s => `${s}=${arms[s].reduce((a, b) => a + b.ms, 0)}ms`).join('  ')}`);
console.log(`speedup vs scale 1: ${SCALES.map(s => `${s}=${(arms[SCALES[0]].reduce((a, b) => a + b.ms, 0) / Math.max(1, arms[s].reduce((a, b) => a + b.ms, 0))).toFixed(2)}x`).join('  ')}`);
const changed = SCALES.filter(s => arms[s].some((r, i) => r.msgSha !== base[i].msgSha));
console.log(`settings that change ANY complete message hash: ${changed.length ? changed.join(', ') : 'NONE'}`);
fs.mkdirSync('bench/x104/receipts', { recursive: true });
fs.writeFileSync('bench/x104/receipts/speedsweep.json', JSON.stringify({ scales: SCALES, lanes: lanes.length, arms }, null, 1) + '\n');
