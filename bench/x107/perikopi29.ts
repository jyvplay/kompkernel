/**
 * X107 — ΠΕΡΙΚΟΠΉ CHAIN-LEVEL A/B, MEASURED ON THE FUNCTION THE ENCODER SHIPS.
 *
 * X107's routing finding: `tagstackFrontier` is documented as the identity WITHOUT
 * the X74 candidates (it is exported so the candidates can price their bodies
 * against it without recursing), and it calls tagstackEncodeUncached ->
 * tagstackEncodeInner, never tagstackX74Chain, which is where every registry arm is
 * admitted.  Five turns of "frontier" receipts therefore priced the identity layer,
 * not the encoder's output.  This probe uses `tagstackEncode` with OMEGA_NO_MEMO=1,
 * which routes to tagstackX74Chain directly — the real shipped chain.
 *
 * Both arms run in one process, arms interleaved per lane (the X106 lesson: a
 * cold/warm pair is not a CPU figure).
 *
 * The arm OFF is the shipped frontier: OMEGA_NO_PERIKOPI=1. The arm ON is the same
 * code with the legend-abridgement pass live. Both pin OMEGA_DET, OMEGA_NO_MEMO,
 * OMEGA_ENGRAM, OMEGA_OURA_MEMO (the X67 OURA memo changes the emitted wire) and
 * OMEGA_NO_OROTHESIA (ΟΡΟΘΕΣΙΑ is Δ=0 on 29/29 and only adds CPU noise).
 *
 * The lane set is read from the first argument, defaulting to /tmp/lanes.txt.
 * To get a fast honest read on the lanes that actually carry a legend, pass
 * bench/x107/lanes-legend.txt.
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0'; process.env.OMEGA_OURA_MEMO = '0';
process.env.OMEGA_NO_OROTHESIA = '1';
const enc: any = 'o200k_base';
const laneFile = process.argv[2] ?? '/tmp/lanes.txt';
const outLog = process.argv[3] ?? 'bench/x107/receipts/perikopi.log';
const lanes = fs.readFileSync(laneFile, 'utf8').split('\n').filter(Boolean);
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const ARMS = ['off', 'on'] as const;
// warm both arms once on a small lane so neither is measured cold
for (const a of ARMS) { process.env.OMEGA_NO_PERIKOPI = a === 'off' ? '1' : ''; tagstackEncode(fs.readFileSync('bench/holdout-work/kb-article.txt', 'utf8'), enc); }
const f = fs.openSync(outLog, 'w');
fs.writeSync(f, 'lane\tarm\ttokens\texact\tparent\tsha\tms\n');
const arms: Record<string, any[]> = { off: [], on: [] };
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const name = p.split('/').pop()!;
  const row: any = {};
  for (const a of ARMS) {
    process.env.OMEGA_NO_PERIKOPI = a === 'off' ? '1' : '';
    const t1 = Date.now();
    const r: any = tagstackEncode(text, enc);
    row[a] = { tokens: r.messageTokens, exact: r.decoded === text, parent: r.parentCodec, sha: sha(JSON.stringify(r)), ms: Date.now() - t1, notes: r.notes ?? '' };
    arms[a].push({ path: p, tokens: r.messageTokens, exact: r.decoded === text, ms: row[a].ms });
    fs.writeSync(f, `${name}\t${a}\t${r.messageTokens}\t${r.decoded === text}\t${r.parentCodec}\t${row[a].sha.slice(0, 12)}\t${row[a].ms}\n`);
  }
  const d = row.on.tokens - row.off.tokens;
  console.log(`${name.padEnd(22)} off ${String(row.off.tokens).padStart(5)}  on ${String(row.on.tokens).padStart(5)}  D ${d > 0 ? '+' : ''}${String(d).padStart(3)}  exact ${row.off.exact}/${row.on.exact}  shaSame=${row.off.sha === row.on.sha}  ms ${row.off.ms}/${row.on.ms}`);
  if (d < 0) console.log(`     ON notes: ${row.on.notes.slice(0, 300)}`);
}
for (const a of ARMS) console.log(`${a.padEnd(4)} TOTAL ${String(arms[a].reduce((x, y) => x + y.tokens, 0)).padStart(6)}  exact ${arms[a].filter((r) => r.exact).length}/${lanes.length}  ms ${arms[a].reduce((x, y) => x + y.ms, 0)}`);
const d = arms.on.reduce((x, y) => x + y.tokens, 0) - arms.off.reduce((x, y) => x + y.tokens, 0);
fs.writeSync(f, `TOTAL\t\toff ${arms.off.reduce((x, y) => x + y.tokens, 0)}\ton ${arms.on.reduce((x, y) => x + y.tokens, 0)}\tD ${d}\n`);
fs.closeSync(f);
console.log(`\nPERIKOPI CHAIN DELTA ${d}  (negative is a win)`);
fs.writeFileSync(outLog.replace(/\.log$/, '.json'), JSON.stringify({ lanes, arms, delta: d }, null, 1));
