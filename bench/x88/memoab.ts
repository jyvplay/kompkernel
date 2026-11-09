/** X88 — interleaved A/B of the count-memo retained-key budget, IN ONE PROCESS.
 *
 *  Wall time drifts ~1.6x across sandbox suspensions, so run C vs run D clocks prove
 *  nothing. The only honest comparison flips the knob inside a single process and
 *  alternates the order, so drift lands on both arms equally. Fidelity requirement:
 *  the frontier total per lane must be IDENTICAL under both budgets — the memo stores
 *  the integer a pure function returned, so any difference is a bug, not a speedup.
 *  Run with OMEGA_NO_MEMO=1 so tagstackFrontier re-encodes instead of replaying. */
import * as fs from 'node:fs';
import { chunkCacheClear, chunkCacheStats, setCountMemoBudget } from '../../src/lib/omega/bpe';
import { tagstackFrontier, tagstackMemoClear } from '../../src/lib/omega/tagstack';

const LANES = ['bench/holdout/code-ts.txt', 'bench/holdout/json-pkg.txt', 'bench/holdout-x41/ls-real.txt'];
const CAPS = [2_000_000, 32_000_000];
const out: any[] = [];
for (const p of LANES) {
  const text = fs.readFileSync(p, 'utf8');
  for (let round = 0; round < 2; round++) {
    // alternate the order each round so any drift is split between the two budgets
    const order = round % 2 === 0 ? CAPS : [...CAPS].reverse();
    for (const cap of order) {
      setCountMemoBudget(cap);
      chunkCacheClear(); tagstackMemoClear();
      const t0 = Date.now();
      const r: any = tagstackFrontier(text, 'o200k_base' as any);
      const ms = Date.now() - t0;
      const st = chunkCacheStats();
      out.push({ lane: p.split('/').pop(), round, cap, F: r.messageTokens, parent: r.parentCodec,
        exact: r.decoded === text, ms, longSize: st.longSize, longChars: st.longChars,
        longHits: st.longHits, longMisses: st.longMisses, chunkHits: st.hits, chunkMisses: st.misses });
      const o = out[out.length - 1];
      console.log(`${o.lane.padEnd(14)} r${round} cap=${String(cap).padStart(9)}  F=${String(o.F).padStart(5)} parent=${String(o.parent).padEnd(12)} exact=${o.exact}  ${String(ms).padStart(6)}ms  longSize=${String(o.longSize).padStart(5)} longChars=${String(o.longChars).padStart(9)} hits=${o.longHits} miss=${o.longMisses}`);
      fs.mkdirSync('bench/x88/receipts', { recursive: true });
      fs.writeFileSync('bench/x88/receipts/memo-ab.json', JSON.stringify({ rows: out }, null, 1) + '\n');
    }
  }
}
console.log('\n=== verdict ===');
let allExact = true, totOld = 0, totNew = 0;
for (const p of LANES) {
  const lane = p.split('/').pop();
  const rows = out.filter((r) => r.lane === lane);
  const Fs = new Set(rows.map((r) => r.F));
  const ex = rows.every((r) => r.exact);
  const oldMs = rows.filter((r) => r.cap === 2_000_000).map((r) => r.ms);
  const newMs = rows.filter((r) => r.cap === 32_000_000).map((r) => r.ms);
  const oM = oldMs.reduce((a, b) => a + b, 0) / oldMs.length;
  const nM = newMs.reduce((a, b) => a + b, 0) / newMs.length;
  totOld += oM; totNew += nM;
  if (Fs.size !== 1 || !ex) allExact = false;
  const saturated = rows.filter((r) => r.cap === 2_000_000).every((r) => r.longChars >= 1_900_000);
  console.log(`${lane.padEnd(16)} F=${[...Fs].join('/')} (must be one value) exact=${ex}  2M=${oM.toFixed(0)}ms  32M=${nM.toFixed(0)}ms  speedup=${(oM / nM).toFixed(2)}x  2M-budget-saturated=${saturated}`);
}
console.log(`\nIDENTICAL F AND EXACT ON ALL LANES: ${allExact}`);
console.log(`mean total 2M=${totOld.toFixed(0)}ms  32M=${totNew.toFixed(0)}ms  speedup=${(totOld / totNew).toFixed(2)}x`);
