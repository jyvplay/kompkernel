/** X89 — REBALANCE THE TWO METERS.  The speed sweep found something more interesting than
 *  speed: the CHIRON meter binds at exactly 100% on nearly every lane (its `used` equals
 *  its allowance to within a few units), while the ARIADNE/DAEDALUS work meter binds at
 *  19.9%-64.6%. The two allowances are set independently -- workBudgetFor = 2M + 100/char,
 *  chironBudgetFor = 4M + 500/char -- so one search is being truncated by its meter while
 *  the other is given more allowance than it spends.
 *
 *  A truncated search stops with its best-so-far, so the truncation is not free: it is a
 *  bound on the wire quality. That makes the rebalance a COMPRESSION question before it is
 *  a speed question, and it is the one budget increase that could actually move a token
 *  count -- the previously measured insensitivity to budget (x0.25..x16 all 315 on ps-ef)
 *  was a sweep of the work meter, which is the meter that does NOT bind.
 *
 *  Settings are compared against the default in ONE interleaved process under OMEGA_DET=1
 *  with OMEGA_ENGRAM=0, and scored on the SHA-256 of the complete message as well as its
 *  token count, so a wire that changes shape at equal cost is still reported as a change.
 *  Anything that lowers tokens here is a real improvement to the representation the parents
 *  compete on, and it is verified byte-exact on the same pass. */
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncodeUncached } from '../../src/lib/omega/tagstack';
import { workBudgetFor, chironBudgetFor, workLastEpochUsed, chironLastEpochUsedUnits } from '../../src/lib/omega/workmeter';

const enc = 'o200k_base' as any;
const sha = (s: string) => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
const SETTINGS: { label: string; w: number; c: number }[] = [
  { label: 'default', w: 1, c: 1 },
  { label: 'w1c2', w: 1, c: 2 },
  { label: 'w1c4', w: 1, c: 4 },
  { label: 'w1c8', w: 1, c: 8 },
  { label: 'w.5c4', w: 0.5, c: 4 },
];
const out: any = { det: process.env.OMEGA_DET ?? null, engram: process.env.OMEGA_ENGRAM ?? null, settings: SETTINGS.map((s) => s.label), lanes: [] };
const t0 = Date.now();
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const lane = p.split('/').pop()!;
  const chars = text.length;
  const per: any = { lane, chars, raw: countTokens(text, enc), passes: [] };
  // The base allowances must be read ONCE, with the overrides cleared: workBudgetFor and
  // chironBudgetFor return OMEGA_WORK_BUDGET / OMEGA_CHIRON_BUDGET when those are set, so
  // reading them inside the loop makes every multiplier compound on the previous pass
  // instead of applying to the base. The first version of this probe had that bug and its
  // "w.5c4" pass actually ran at 0.125x work and 16x chiron.
  delete process.env.OMEGA_WORK_BUDGET; delete process.env.OMEGA_CHIRON_BUDGET;
  const baseW = workBudgetFor(chars), baseC = chironBudgetFor(chars);
  per.baseWork = baseW; per.baseChiron = baseC;
  for (const s of SETTINGS) {
    process.env.OMEGA_WORK_BUDGET = String(Math.round(baseW * s.w));
    process.env.OMEGA_CHIRON_BUDGET = String(Math.round(baseC * s.c));
    const t = Date.now();
    const r: any = tagstackEncodeUncached(text, enc);
    per.passes.push({ label: s.label, w: s.w, c: s.c, workBudget: Math.round(baseW * s.w), chironBudget: Math.round(baseC * s.c),
      ms: Date.now() - t, tokens: r.messageTokens, sha: sha(r.message),
      parent: r.parentCodec, exact: r.decoded === text,
      workBind: +(100 * workLastEpochUsed() / Math.round(baseW * s.w)).toFixed(1),
      chironBind: +(100 * chironLastEpochUsedUnits() / Math.round(baseC * s.c)).toFixed(1) });
  }
  delete process.env.OMEGA_WORK_BUDGET; delete process.env.OMEGA_CHIRON_BUDGET;
  const b = per.passes[0];
  const best = per.passes.reduce((m: any, q: any) => (q.tokens < m.tokens ? q : m), b);
  per.bestLabel = best.label; per.bestTokens = best.tokens; per.gain = best.tokens - b.tokens;
  per.exactAll = per.passes.every((q: any) => q.exact);
  out.lanes.push(per);
  console.log(`${lane.padEnd(24)} raw=${String(per.raw).padStart(5)} default=${String(b.tokens).padStart(5)}(${b.ms}ms, chironBind=${b.chironBind}%)  ` +
    per.passes.slice(1).map((q: any) => `${q.label}=${q.tokens}${q.tokens < b.tokens ? '*' : ''}(${q.ms}ms)`).join(' ') +
    `  best=${per.bestLabel} ${per.bestTokens} gain=${per.gain} exactAll=${per.exactAll}`);
  fs.mkdirSync('bench/x89/receipts', { recursive: true });
  fs.writeFileSync('bench/x89/receipts/rebalance.json', JSON.stringify(out, null, 1) + '\n');
}
const b = out.lanes.map((l: any) => l.passes[0].tokens).reduce((a: number, x: number) => a + x, 0);
console.log(`\n=== REBALANCE VERDICT over ${out.lanes.length} lanes (default total ${b}) ===`);
for (const s of SETTINGS.slice(1)) {
  const t = out.lanes.map((l: any) => l.passes.find((q: any) => q.label === s.label).tokens).reduce((a: number, x: number) => a + x, 0);
  const ms = out.lanes.map((l: any) => l.passes.find((q: any) => q.label === s.label).ms).reduce((a: number, x: number) => a + x, 0);
  const worse = out.lanes.filter((l: any) => l.passes.find((q: any) => q.label === s.label).tokens > l.passes[0].tokens).map((l: any) => l.lane);
  const better = out.lanes.filter((l: any) => l.passes.find((q: any) => q.label === s.label).tokens < l.passes[0].tokens).map((l: any) => `${l.lane}:${l.passes[0].tokens}->${l.passes.find((q: any) => q.label === s.label).tokens}`);
  console.log(`  ${s.label.padEnd(7)} total=${String(t).padStart(6)} (${t - b >= 0 ? '+' : ''}${t - b})  ms=${String(ms).padStart(7)}  lanesBetter=${better.length}${better.length ? ' [' + better.join(' ') + ']' : ''}  lanesWorse=${worse.length}${worse.length ? ' [' + worse.join(',') + ']' : ''}`);
}
console.log(`elapsed ${Date.now() - t0} ms`);
