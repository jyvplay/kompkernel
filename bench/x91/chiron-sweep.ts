/**
 * X91 — SWEEP THE CHIRON METER *DOWNWARD*, WHICH NOBODY HAS EVER DONE.
 *
 * bench/x89/receipts/rebalance.json holds a measurement that was recorded as a speed result
 * and never read as a structural one. Its five settings are default, w1c2, w1c4, w1c8 and
 * w.5c4. On all seven lanes and in ALL FIVE settings, chironBind is 100% -- including at 8x
 * the allowance -- while the token count is IDENTICAL and, on six of seven lanes, the SHA-256
 * of the complete message is identical. workBind meanwhile sits at 25-68%.
 *
 * Two readings are possible and they have opposite consequences:
 *   (a) chiron genuinely spends every unit it is given and the extra search finds nothing;
 *   (b) chironLastEpochUsedUnits() reports the allowance rather than the work, so 100% is an
 *       artifact of the probe and says nothing.
 * Under (a) the chiron allowance is pure waste and cutting it is free. Under (b) the 100% is
 * meaningless and cutting it is unmeasured. EVERY setting tested so far has c >= 1, so the
 * corpus cannot distinguish them. This probe distinguishes them by cutting c below 1 and
 * scoring on the SHA-256 of the complete message, not on the token count, because X89's own
 * rule is that two lanes changed wire at an unchanged count.
 *
 * Interleaved in ONE process, OMEGA_DET=1, OMEGA_ENGRAM=0 (timing two passes in one process
 * needs the memoiser off), base allowances captured ONCE with the overrides cleared so the
 * multipliers do not compound -- the bug that made X89's first probe report 0.125x work and
 * 16x chiron for a pass labelled w.5c4.
 *
 * The receipt is written after EVERY lane, so a mid-turn workspace reset loses at most the
 * lane in flight rather than the whole sweep.
 */
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncodeUncached } from '../../src/lib/omega/tagstack';
import { workBudgetFor, chironBudgetFor, workLastEpochUsed, chironLastEpochUsedUnits } from '../../src/lib/omega/workmeter';

const enc = 'o200k_base' as any;
const sha = (s: string) => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
const OUT = process.env.X91_SWEEP_OUT || 'bench/x91/receipts/chiron-sweep.json';

const SETTINGS: { label: string; w: number; c: number }[] = [
  { label: 'default', w: 1, c: 1 },
  { label: 'w1c.5', w: 1, c: 0.5 },
  { label: 'w1c.25', w: 1, c: 0.25 },
  { label: 'w1c.1', w: 1, c: 0.1 },
  { label: 'w.5c1', w: 0.5, c: 1 },
  { label: 'w.5c.5', w: 0.5, c: 0.5 },
  { label: 'w.5c4', w: 0.5, c: 4 },
];

const out: any = {
  det: process.env.OMEGA_DET ?? null, engram: process.env.OMEGA_ENGRAM ?? null,
  settings: SETTINGS.map(s => s.label), note: 'chiron swept BELOW 1 for the first time; scored on sha256 of the complete message',
  lanes: [],
};
fs.mkdirSync(OUT.replace(/\/[^/]*$/, ''), { recursive: true });
const t0 = Date.now();

for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const lane = p.split('/').pop()!;
  const chars = text.length;
  const per: any = { lane, path: p, chars, raw: countTokens(text, enc), passes: [] };
  delete process.env.OMEGA_WORK_BUDGET; delete process.env.OMEGA_CHIRON_BUDGET;
  const baseW = workBudgetFor(chars), baseC = chironBudgetFor(chars);
  per.baseWork = baseW; per.baseChiron = baseC;
  for (const s of SETTINGS) {
    const wb = Math.round(baseW * s.w), cb = Math.round(baseC * s.c);
    process.env.OMEGA_WORK_BUDGET = String(wb);
    process.env.OMEGA_CHIRON_BUDGET = String(cb);
    const t = Date.now();
    const r: any = tagstackEncodeUncached(text, enc);
    per.passes.push({
      label: s.label, w: s.w, c: s.c, workBudget: wb, chironBudget: cb,
      ms: Date.now() - t, tokens: r.messageTokens, sha: sha(r.message),
      parent: r.parentCodec, exact: r.decoded === text,
      workBind: +(100 * workLastEpochUsed() / wb).toFixed(1),
      chironBind: +(100 * chironLastEpochUsedUnits() / cb).toFixed(1),
    });
  }
  delete process.env.OMEGA_WORK_BUDGET; delete process.env.OMEGA_CHIRON_BUDGET;
  const b = per.passes[0];
  per.shaIdenticalAll = per.passes.every((q: any) => q.sha === b.sha);
  per.exactAll = per.passes.every((q: any) => q.exact);
  per.msDefault = b.ms;
  per.msBest = Math.min(...per.passes.map((q: any) => q.ms));
  out.lanes.push(per);
  console.log(`${lane.padEnd(22)} ch=${String(chars).padStart(6)} def=${String(b.tokens).padStart(5)}/${String(b.ms).padStart(6)}ms ` +
    per.passes.slice(1).map((q: any) => `${q.label}:${q.tokens}${q.sha === b.sha ? '=' : '!'}/${q.ms}ms`).join(' ') +
    ` shaAll=${per.shaIdenticalAll} exactAll=${per.exactAll}`);
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
}

console.log(`\n=== VERDICT over ${out.lanes.length} lanes ===`);
const d = out.lanes.map((l: any) => l.passes[0]);
const dt = d.reduce((a: number, q: any) => a + q.tokens, 0), dm = d.reduce((a: number, q: any) => a + q.ms, 0);
console.log(`default: tokens ${dt}  ms ${dm}`);
for (const s of SETTINGS.slice(1)) {
  const ps = out.lanes.map((l: any) => l.passes.find((q: any) => q.label === s.label));
  const t = ps.reduce((a: number, q: any) => a + q.tokens, 0), m = ps.reduce((a: number, q: any) => a + q.ms, 0);
  const diffSha = out.lanes.filter((l: any) => l.passes.find((q: any) => q.label === s.label).sha !== l.passes[0].sha).map((l: any) => l.lane);
  const inexact = out.lanes.filter((l: any) => !l.passes.find((q: any) => q.label === s.label).exact).map((l: any) => l.lane);
  console.log(`  ${s.label.padEnd(8)} tokens ${String(t).padStart(6)} (${t - dt >= 0 ? '+' : ''}${t - dt})  ms ${String(m).padStart(7)}  speedup x${(dm / m).toFixed(2)}` +
    `  sha-differing ${diffSha.length}${diffSha.length ? ' [' + diffSha.join(',') + ']' : ''}  INEXACT ${inexact.length}${inexact.length ? ' [' + inexact.join(',') + ']' : ''}`);
}
console.log(`elapsed ${Date.now() - t0} ms`);
out.summary = { defaultTokens: dt, defaultMs: dm, settings: SETTINGS.slice(1).map((s) => {
  const ps = out.lanes.map((l: any) => l.passes.find((q: any) => q.label === s.label));
  return { label: s.label, tokens: ps.reduce((a: number, q: any) => a + q.tokens, 0), ms: ps.reduce((a: number, q: any) => a + q.ms, 0),
    shaDiffering: out.lanes.filter((l: any) => l.passes.find((q: any) => q.label === s.label).sha !== l.passes[0].sha).length,
    inexact: out.lanes.filter((l: any) => !l.passes.find((q: any) => q.label === s.label).exact).length };
}) };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
