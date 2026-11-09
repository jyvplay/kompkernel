/**
 * X91 — WHICH METER IS UNSOUND? ISOLATE THEM.
 *
 * The large-lane sweep falsified the uniform candidate: ps-aux-real at w.5c.5 (both meters
 * halved again, i.e. factor 0.25 against the pre-gate base) returned 1053 tokens against the
 * shipped default's 1042. It is still byte-exact -- a budget bounds the SEARCH, not the
 * VERIFICATION, so the only available failure is a larger message -- but a +11 token
 * regression on one lane means 0.25 is not sound as a UNIFORM factor, and the 21-lane sweep
 * that found 0 differing simply did not contain this lane.
 *
 * X89 couples both meters to ONE factor: `x89BudgetFactor(chars)` multiplies workBudgetFor and
 * chironBudgetFor by the same number. Nothing ever tested whether the two meters have the same
 * sound reduction point, and the two are not interchangeable: the work meter bounds ARIADNE's
 * glyph-assignment hill-climb, while the chiron meter bounds the rule search that decides the
 * TAPE. A truncated glyph assignment can only make the wire cost more; a truncated rule search
 * can make it contain different rules. The second is the one that should be able to change
 * tokens, and if that is what the data shows then coupling them is the defect and the arm
 * should gate them separately.
 *
 * Settings are chosen to separate the meters one at a time. Scored on tokens AND on the
 * SHA-256 of the complete message, because this corpus has now produced that divergence twice
 * (X89: df-real and df-h changed wire at an unchanged count; X93: ps-ef did the same under
 * w.5c4) and a token-only score reports identity for a wire that moved.
 */
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncodeUncached } from '../../src/lib/omega/tagstack';
import { workBudgetFor, chironBudgetFor } from '../../src/lib/omega/workmeter';

const enc = 'o200k_base' as any;
const sha = (s: string) => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
const OUT = process.env.X91_ISO_OUT || 'bench/x91/receipts/meter-isolate.json';
const SETTINGS: { label: string; w: number; c: number; what: string }[] = [
  { label: 'default', w: 1, c: 1, what: 'the shipped configuration (both meters already x0.5 under the 8000-char gate)' },
  { label: 'w.5c1', w: 0.5, c: 1, what: 'WORK halved again, CHIRON untouched' },
  { label: 'w1c.5', w: 1, c: 0.5, what: 'WORK untouched, CHIRON halved again' },
  { label: 'w.5c.5', w: 0.5, c: 0.5, what: 'both halved again == uniform factor 0.25, the falsified candidate' },
];
const out: any = { det: process.env.OMEGA_DET ?? null, engram: process.env.OMEGA_ENGRAM ?? null,
  settings: SETTINGS.map(s => ({ label: s.label, w: s.w, c: s.c, what: s.what })), lanes: [] };
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
    process.env.OMEGA_WORK_BUDGET = String(wb); process.env.OMEGA_CHIRON_BUDGET = String(cb);
    const t = Date.now();
    const r: any = tagstackEncodeUncached(text, enc);
    const ms = Date.now() - t;
    per.passes.push({ label: s.label, w: s.w, c: s.c, workBudget: wb, chironBudget: cb, ms,
      tokens: r.messageTokens, sha: sha(r.message), exact: r.decoded === text });
    console.log(`  ${lane} ${s.label.padEnd(7)} ${String(r.messageTokens).padStart(5)} tok ${String(ms).padStart(7)}ms exact=${r.decoded === text} sha=${sha(r.message)}`);
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  }
  delete process.env.OMEGA_WORK_BUDGET; delete process.env.OMEGA_CHIRON_BUDGET;
  const b = per.passes[0];
  per.regressions = per.passes.slice(1).filter((q: any) => q.tokens > b.tokens).map((q: any) => `${q.label}:${b.tokens}->${q.tokens}`);
  per.shaDiffs = per.passes.slice(1).filter((q: any) => q.sha !== b.sha).map((q: any) => q.label);
  per.exactAll = per.passes.every((q: any) => q.exact);
  out.lanes.push(per);
  console.log(`${lane.padEnd(20)} def=${b.tokens}/${b.ms}ms  regressions=[${per.regressions.join(' ')}]  sha-diffs=[${per.shaDiffs.join(' ')}]  exactAll=${per.exactAll}  elapsed=${Date.now() - t0}ms`);
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
}
console.log(`\n=== METER ISOLATION VERDICT over ${out.lanes.length} lanes ===`);
for (const s of SETTINGS.slice(1)) {
  const ps = out.lanes.map((l: any) => l.passes.find((q: any) => q.label === s.label));
  const dt = out.lanes.reduce((a: number, l: any) => a + l.passes[0].tokens, 0);
  const t = ps.reduce((a: number, q: any) => a + q.tokens, 0);
  const m = ps.reduce((a: number, q: any) => a + q.ms, 0);
  const dm = out.lanes.reduce((a: number, l: any) => a + l.passes[0].ms, 0);
  const worse = out.lanes.filter((l: any) => l.passes.find((q: any) => q.label === s.label).tokens > l.passes[0].tokens).map((l: any) => `${l.lane}(+${l.passes.find((q: any) => q.label === s.label).tokens - l.passes[0].tokens})`);
  console.log(`  ${s.label.padEnd(7)} ${s.what}`);
  console.log(`          tokens ${t} (${t - dt >= 0 ? '+' : ''}${t - dt})  ms ${m} x${(dm / m).toFixed(2)}  lanes-worse ${worse.length}${worse.length ? ' [' + worse.join(' ') + ']' : ''}`);
}
out.summary = { elapsed: Date.now() - t0 };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
