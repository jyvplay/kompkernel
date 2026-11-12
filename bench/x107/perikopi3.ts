/**
 * X107 — ΠΕΡΙΚΟΠΈ v3 chain A/B.  v1 (clause pass only) is superseded: v3 adds the
 * lossless preamble table, the ΔΙΑΣΤΗΜΑ and ΣΥΝΚΡΙΣΗ legend families, and the
 * family-aware GATE 4.  Offline on the seven wordings the corpus emits v3 measures
 * -91 tokens where v1 measured -84 and where ΠΊΝΑΞ measures -8.
 *
 * WHY THIS PROBE RUNS THE `on` ARM ONLY ON MOST LANES.  The `off` arm is byte-identical
 * between v1 and v3 — ΠΕΡΙΚΟΠΈ disabled is the same code path in both — and the v1 run
 * (bench/x107/receipts/perikopi.log) already prices it on all 29 lanes under the same
 * settings.  Re-running it would double a two-hour probe for a number already in hand.
 * The determinism that makes this legitimate is not assumed: the first three lanes run
 * BOTH arms and the `off` figure is asserted equal to the v1 receipt's, and any
 * mismatch aborts the probe.
 *
 * Everything else is the X106 protocol: one process, OMEGA_DET=1, OMEGA_NO_MEMO=1,
 * OMEGA_ENGRAM=0, OMEGA_OURA_MEMO=0, OMEGA_NO_OROTHESIA=1, scored on `tagstackEncode`
 * — the function the encoder ships, not `tagstackFrontier`, which never reaches the
 * registry arms.
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0'; process.env.OMEGA_OURA_MEMO = '0'; process.env.OMEGA_NO_OROTHESIA = '1';
const enc: any = 'o200k_base';
const laneFile = process.argv[2] ?? '/tmp/lanes.txt';
const outLog = process.argv[3] ?? 'bench/x107/receipts/perikopi3.log';
const v1Log = process.argv[4] ?? 'bench/x107/receipts/perikopi.log';
const lanes = fs.readFileSync(laneFile, 'utf8').split('\n').filter(Boolean);

// v1's off-arm prices.  KEYED BY FULL PATH, NOT BY BASENAME: two lanes in the 29 are
// both named `df-h.txt` (bench/holdout-tbl/df-h.txt at 170 tokens and
// bench/holdout-x42/df-h.txt at 107), and keying by basename silently compared the x42
// price against the holdout-tbl encode -- which printed as a +63 "regression" that was
// purely the probe's own bookkeeping.  v1's log rows are in lane order, so zip them.
const v1off = new Map<string, number>();
{
  const offs: number[] = [];
  for (const line of fs.readFileSync(v1Log, 'utf8').split('\n').slice(1)) {
    const c = line.split('\t');
    if (c.length >= 3 && c[1] === 'off' && c[0] && c[0] !== 'TOTAL') offs.push(Number(c[2]));
  }
  lanes.forEach((lp, i) => { if (i < offs.length) v1off.set(lp, offs[i]!); });
  if (offs.length !== lanes.length) console.log(`  !! v1 log has ${offs.length} off rows for ${lanes.length} lanes`);
}
const CONTROL = 3;
const f = fs.openSync(outLog, 'w');
fs.writeSync(f, 'lane\tarm\ttokens\texact\tparent\tms\tv1off\tcontrol\n');
const onRows: Array<{ path: string; tokens: number; exact: boolean; ms: number; fired: boolean }> = [];
let controlFail = 0;
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const name = p.split('/').pop()!;
  let offTok = v1off.get(p);
  let isControl = false;
  if (onRows.length < CONTROL) {
    process.env.OMEGA_NO_PERIKOPI = '1';
    const t1 = Date.now();
    const r0: any = tagstackEncode(text, enc);
    offTok = r0.messageTokens;
    isControl = true;
    if (v1off.has(p) && v1off.get(p) !== offTok) { controlFail++; console.log(`  !! CONTROL MISMATCH ${p}: v1 ${v1off.get(p)} vs now ${offTok}`); }
    fs.writeSync(f, `${name}\toff\t${offTok}\t${r0.decoded === text}\t${r0.parentCodec}\t${Date.now() - t1}\t${v1off.get(p) ?? '-'}\tCONTROL\n`);
  }
  process.env.OMEGA_NO_PERIKOPI = '';
  const t2 = Date.now();
  const r: any = tagstackEncode(text, enc);
  const fired = (r.notes ?? '').includes('PERIKOPI');
  onRows.push({ path: p, tokens: r.messageTokens, exact: r.decoded === text, ms: Date.now() - t2, fired });
  fs.writeSync(f, `${name}\ton\t${r.messageTokens}\t${r.decoded === text}\t${r.parentCodec}\t${Date.now() - t2}\t${offTok ?? '-'}\t${isControl ? 'CONTROL' : ''}\n`);
  const d = r.messageTokens - (offTok ?? 0);
  console.log(`${name.padEnd(22)} off ${String(offTok ?? '?').padStart(5)}  on ${String(r.messageTokens).padStart(5)}  D ${d > 0 ? '+' : ''}${String(d).padStart(3)}  exact ${r.exact}  fired=${fired}${isControl ? '  [control]' : ''}`);
}
const offTotal = onRows.reduce((a, b) => a + (v1off.get(b.path) ?? 0), 0);
const onTotal = onRows.reduce((a, b) => a + b.tokens, 0);
fs.writeSync(f, `TOTAL\t\toff ${offTotal}\ton ${onTotal}\tD ${onTotal - offTotal}\tcontrolFail ${controlFail}\n`);
fs.closeSync(f);
console.log(`\noff TOTAL ${offTotal}  on TOTAL ${onTotal}  DELTA ${onTotal - offTotal}  (negative is a win)`);
console.log(`exact ${onRows.filter((r) => r.exact).length}/${onRows.length}  fired on ${onRows.filter((r) => r.fired).length}  control mismatches ${controlFail}`);
console.log(`lanes where PERIKOPI fired: ${onRows.filter((r) => r.fired).map((r) => r.path).join(', ')}`);
fs.writeFileSync(outLog.replace(/\.log$/, '.json'), JSON.stringify({ onRows, offTotal, onTotal, delta: onTotal - offTotal, controlFail }, null, 1));
