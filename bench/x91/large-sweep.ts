/**
 * X91 — THE LARGE-LANE SWEEP, WHICH IS ALSO THE COMPRESSION EXPERIMENT.
 *
 * chiron-sweep.ts covers the 21 smallest gate lanes and finds every setting byte-identical
 * with no token movement anywhere. That is the expected result on small lanes: their searches
 * converge well inside any allowance. The lanes where a truncated search could actually cost
 * TOKENS are the large ones, because chironBind is 100% at every allowance tested (rebalance
 * found it at 100% even at 8x), so chiron is the meter that is always truncated and a
 * truncated search returns best-so-far.
 *
 * So this sweep adds the two settings that spend MORE on chiron (w1c4, w1c8) to the one that
 * spends less (w.5c.5, the shipped candidate), on the eight largest lanes. If raising chiron
 * lowers a token count anywhere, that is a compression result and it is reported as one; if it
 * does not, the honest conclusion is that chiron's truncation is not costing this corpus
 * anything, and the 100% binding figure is an artifact of how the meter is spent rather than a
 * bound on wire quality.
 *
 * ls-l-real is included deliberately even though it sits ABOVE the size gate: the point of
 * running it is to demonstrate that the gate excludes it, i.e. that the candidate setting
 * changes nothing there because the arm cannot reach it. That is a claim about coverage and
 * coverage claims get measured here rather than asserted.
 */
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncodeUncached } from '../../src/lib/omega/tagstack';
import { workBudgetFor, chironBudgetFor, workLastEpochUsed, chironLastEpochUsedUnits } from '../../src/lib/omega/workmeter';
import { euthynteriaApplies } from '../../src/lib/omega/euthynteria';

const enc = 'o200k_base' as any;
const sha = (s: string) => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
const OUT = process.env.X91_LARGE_OUT || 'bench/x91/receipts/large-sweep.json';
const SETTINGS: { label: string; w: number; c: number }[] = [
  { label: 'default', w: 1, c: 1 },
  { label: 'w.5c.5', w: 0.5, c: 0.5 },   // == EUTHYNTERIA_FACTOR 0.25 of the pre-gate base
  { label: 'w1c4', w: 1, c: 4 },          // spend MORE on the meter that always binds
  // w.5c4 (the X90 lead) is NOT swept here: the 21-lane sweep already falsified it. It
  // changed ps-ef.txt's wire at an UNCHANGED token count (315 -> 315), which is precisely
  // the failure mode X89 documented for df-real and df-h and the reason this probe scores on
  // SHA-256 rather than on tokens. One counterexample kills a universal claim, so spending
  // 8 large-lane passes to confirm it again is not the best use of the remaining budget.
];
const out: any = { det: process.env.OMEGA_DET ?? null, engram: process.env.OMEGA_ENGRAM ?? null,
  settings: SETTINGS.map(s => s.label), lanes: [] };
fs.mkdirSync(OUT.replace(/\/[^/]*$/, ''), { recursive: true });
const t0 = Date.now();
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const lane = p.split('/').pop()!;
  const chars = text.length;
  const per: any = { lane, path: p, chars, raw: countTokens(text, enc), gated: euthynteriaApplies(chars), passes: [] };
  delete process.env.OMEGA_WORK_BUDGET; delete process.env.OMEGA_CHIRON_BUDGET;
  const baseW = workBudgetFor(chars), baseC = chironBudgetFor(chars);
  per.baseWork = baseW; per.baseChiron = baseC;
  for (const s of SETTINGS) {
    const wb = Math.round(baseW * s.w), cb = Math.round(baseC * s.c);
    process.env.OMEGA_WORK_BUDGET = String(wb); process.env.OMEGA_CHIRON_BUDGET = String(cb);
    const t = Date.now();
    const r: any = tagstackEncodeUncached(text, enc);
    per.passes.push({ label: s.label, w: s.w, c: s.c, workBudget: wb, chironBudget: cb,
      ms: Date.now() - t, tokens: r.messageTokens, sha: sha(r.message), parent: r.parentCodec,
      exact: r.decoded === text, workBind: +(100 * workLastEpochUsed() / wb).toFixed(1),
      chironBind: +(100 * chironLastEpochUsedUnits() / cb).toFixed(1) });
    console.log(`  ${lane} ${s.label}: ${r.messageTokens} tok ${Date.now() - t}ms exact=${r.decoded === text}`);
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  }
  delete process.env.OMEGA_WORK_BUDGET; delete process.env.OMEGA_CHIRON_BUDGET;
  const b = per.passes[0];
  per.shaIdenticalAll = per.passes.every((q: any) => q.sha === b.sha);
  per.exactAll = per.passes.every((q: any) => q.exact);
  per.minTokens = Math.min(...per.passes.map((q: any) => q.tokens));
  per.tokenWinLane = per.passes.filter((q: any) => q.tokens < b.tokens).map((q: any) => `${q.label}:${b.tokens}->${q.tokens}`);
  out.lanes.push(per);
  console.log(`${lane.padEnd(22)} ch=${String(chars).padStart(6)} gated=${per.gated} def=${b.tokens}/${b.ms}ms ` +
    per.passes.slice(1).map((q: any) => `${q.label}:${q.tokens}${q.tokens < b.tokens ? '<<WIN' : q.sha === b.sha ? '=' : '!DIFF'}/${q.ms}ms`).join(' ') +
    ` shaAll=${per.shaIdenticalAll} exactAll=${per.exactAll} elapsed=${Date.now() - t0}ms`);
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
}
console.log(`\n=== LARGE-LANE VERDICT over ${out.lanes.length} lanes ===`);
const d = out.lanes.map((l: any) => l.passes[0]);
const dt = d.reduce((a: number, q: any) => a + q.tokens, 0), dm = d.reduce((a: number, q: any) => a + q.ms, 0);
console.log(`default: tokens ${dt}  ms ${dm}`);
for (const s of SETTINGS.slice(1)) {
  const ps = out.lanes.map((l: any) => l.passes.find((q: any) => q.label === s.label));
  const t = ps.reduce((a: number, q: any) => a + q.tokens, 0), m = ps.reduce((a: number, q: any) => a + q.ms, 0);
  const diff = out.lanes.filter((l: any) => l.passes.find((q: any) => q.label === s.label).sha !== l.passes[0].sha).map((l: any) => l.lane);
  const inexact = out.lanes.filter((l: any) => !l.passes.find((q: any) => q.label === s.label).exact).map((l: any) => l.lane);
  console.log(`  ${s.label.padEnd(8)} tokens ${String(t).padStart(6)} (${t - dt >= 0 ? '+' : ''}${t - dt})  ms ${String(m).padStart(7)} x${(dm / m).toFixed(2)}  sha-differing ${diff.length}${diff.length ? ' [' + diff.join(',') + ']' : ''}  INEXACT ${inexact.length}`);
}
out.summary = { defaultTokens: dt, defaultMs: dm, elapsed: Date.now() - t0 };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`elapsed ${Date.now() - t0} ms`);
