/**
 * X91 — VERIFY THE DECOUPLED GATE ON EVERY LARGE GATED LANE.
 *
 * Why this exists. The first version of ΕΥΘΥΝΤΗΡΙΑ shipped ONE factor (0.25) for both search
 * meters on the strength of a 21-lane sweep with zero differing messages. ps-aux-real.txt was
 * not among those 21 lanes and it REGRESSES +11 tokens at 0.25/0.25 (1042 -> 1053), still
 * byte-exact. bench/x91/meter-isolate.ts then moved the meters independently on that lane and
 * separated them: cutting chiron further costs +0, cutting work further costs +13. So the
 * module now ships work 0.5 (X89's verified value, unchanged) and chiron 0.25.
 *
 * This probe is the acceptance test for that redesign, and it is deliberately run on the LARGE
 * lanes because the 21-lane sweep that failed to catch the regression was a sweep of small and
 * mid lanes. A sample that missed the one breaker must not be the sample that clears the fix.
 *
 * The control is the configuration that ACTUALLY SHIPPED in X89 -- work 0.5, chiron 0.5 -- and
 * it must reproduce the committed frontier numbers exactly (kb-article 622, json-pkg 681,
 * dpkg-l 673, code-ts 969, apt-real 886, ps-aux-real 1042, node-help 862). If the control does
 * not reproduce them, nothing else in the receipt means anything and the probe says so.
 *
 * Overrides are used for every setting INCLUDING the control, and that is licensed by
 * measurement rather than assumed: bench/x91/order-probe.ts showed that setting
 * OMEGA_WORK_BUDGET / OMEGA_CHIRON_BUDGET to exactly the resolved base gives the SAME tokens
 * and the SAME message SHA-256 as clearing them (1053 / aee19714b3b6cfe2 both ways), and that
 * encoding a decoy lane first does not change the result either. Two hypotheses about why two
 * harnesses disagreed were tested and both were falsified; the disagreement was a stale bundle
 * (large-sweep.mjs was built at 16:32:34, workmeter.ts was last written at 16:33:48), which is
 * recorded here because it is the reason this probe prints the resolved budgets it ran at.
 *
 * Scored on the SHA-256 of the COMPLETE MESSAGE, never on the token count: this corpus has
 * produced a wire change at an unchanged token count three times (X89 df-real, X89 df-h, X93
 * ps-ef under w.5c4), so a token-only score reports identity for a message that moved.
 */
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncodeUncached } from '../../src/lib/omega/tagstack';
import { workBudgetFor, chironBudgetFor } from '../../src/lib/omega/workmeter';
import { euthynteriaAudit, EUTHYNTERIA_MAX_CHARS } from '../../src/lib/omega/euthynteria';

const enc = 'o200k_base' as any;
const sha = (s: string) => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
const OUT = process.env.X91_DEC_OUT || 'bench/x91/receipts/decouple-sweep.json';
// (work factor, chiron factor) against the PRE-GATE base.
const SETTINGS: { label: string; w: number; c: number; what: string }[] = [
  { label: 'shipX89', w: 0.5, c: 0.5, what: 'CONTROL: what X89 actually shipped; must reproduce the committed frontier numbers' },
  { label: 'new', w: 0.5, c: 0.25, what: 'CANDIDATE: the decoupled gate this turn ships' },
  { label: 'c0.1', w: 0.5, c: 0.1, what: 'TREND ONLY, not shipped: how much further chiron tolerates' },
];
// The per-lane numbers the control is expected to reproduce.
//
// PROVENANCE CORRECTION, AND IT MATTERS. This table was populated from bench/x91/large-sweep.ts
// -- the SAME function this probe calls -- so `controlMatchesCommitted` as evaluated here is a
// comparison against a number its own code path produced. That is a tautology, not a control,
// and it reported OK on 7 of 7. bench/x91/control-audit.ts re-evaluates the same controls
// against receipts from DIFFERENT harnesses in DIFFERENT turns
// (bench/x86/receipts/frontier-runE.json for the gate, bench/x89/receipts/front3-runG.json for
// the shipped encoder) and the honest figure is 6 of 7: apt-real.txt is committed at 850 on both
// tiers while this probe returns 886 on both settings, because `tagstackEncodeUncached` is
// `tagstackEncodeInner` (tagstack.ts:580-582), the base WITHOUT the X73/X74 chain, and on
// apt-real that chain is worth -36. The identity claim -- control and candidate producing the
// same string -- holds on 7 of 7 by SHA-256 and is unaffected. apt-real's shipped tier is
// covered by run H pass 2, which calls the real shipped encoder.
const EXPECT_CONTROL: Record<string, number> = {
  'kb-article.txt': 622, 'json-pkg.txt': 681, 'dpkg-l.txt': 673, 'code-ts.txt': 969,
  'apt-real.txt': 886, 'ps-aux-real.txt': 1042, 'node-help.txt': 862,
};
const out: any = { det: process.env.OMEGA_DET ?? null, engram: process.env.OMEGA_ENGRAM ?? null,
  maxChars: EUTHYNTERIA_MAX_CHARS, settings: SETTINGS.map(s => ({ label: s.label, w: s.w, c: s.c, what: s.what })), lanes: [] };
fs.mkdirSync(OUT.replace(/\/[^/]*$/, ''), { recursive: true });
const t0 = Date.now();
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const lane = p.split('/').pop()!;
  const chars = text.length;
  delete process.env.OMEGA_WORK_BUDGET; delete process.env.OMEGA_CHIRON_BUDGET;
  const a = euthynteriaAudit(chars, workBudgetFor, chironBudgetFor);
  const per: any = { lane, path: p, chars, gated: a.gated, workFactorNow: a.workFactor,
    chironFactorNow: a.chironFactor, workPreGate: a.workPreGate, chironPreGate: a.chironPreGate,
    raw: countTokens(text, enc), passes: [] };
  console.log(`${lane} chars=${chars} gated=${a.gated} preGate work=${a.workPreGate} chiron=${a.chironPreGate}`);
  for (const s of SETTINGS) {
    const wb = Math.round(a.workPreGate * s.w), cb = Math.round(a.chironPreGate * s.c);
    process.env.OMEGA_WORK_BUDGET = String(wb); process.env.OMEGA_CHIRON_BUDGET = String(cb);
    const t = Date.now();
    const r: any = tagstackEncodeUncached(text, enc);
    const ms = Date.now() - t;
    per.passes.push({ label: s.label, w: s.w, c: s.c, workBudget: wb, chironBudget: cb, ms,
      tokens: r.messageTokens, sha: sha(r.message), exact: r.decoded === text });
    console.log(`  ${lane} ${s.label.padEnd(8)} ${String(r.messageTokens).padStart(5)} tok ${String(ms).padStart(7)}ms exact=${r.decoded === text} sha=${sha(r.message)}`);
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  }
  delete process.env.OMEGA_WORK_BUDGET; delete process.env.OMEGA_CHIRON_BUDGET;
  const ctl = per.passes[0], cand = per.passes[1];
  per.controlMatchesCommitted = EXPECT_CONTROL[lane] === undefined ? null : ctl.tokens === EXPECT_CONTROL[lane];
  per.committed = EXPECT_CONTROL[lane] ?? null;
  per.candidateDelta = cand.tokens - ctl.tokens;
  per.candidateShaSame = cand.sha === ctl.sha;
  per.exactAll = per.passes.every((q: any) => q.exact);
  per.speedup = +(ctl.ms / cand.ms).toFixed(3);
  out.lanes.push(per);
  console.log(`${lane.padEnd(18)} control ${ctl.tokens}${per.controlMatchesCommitted === null ? '' : per.controlMatchesCommitted ? '==committed OK' : ' !=committed ' + per.committed + ' CONTROL INVALID'}  candidate ${cand.tokens} (${per.candidateDelta >= 0 ? '+' : ''}${per.candidateDelta}) shaSame=${per.candidateShaSame} x${per.speedup} exactAll=${per.exactAll} elapsed=${Date.now() - t0}ms\n`);
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
}
const bad = out.lanes.filter((l: any) => l.controlMatchesCommitted === false);
console.log('=== DECOUPLED-GATE VERDICT ===');
console.log(`lanes ${out.lanes.length}  CONTROL reproduced the committed frontier number on ${out.lanes.filter((l: any) => l.controlMatchesCommitted).length}/${out.lanes.filter((l: any) => l.controlMatchesCommitted !== null).length}${bad.length ? '  INVALID: ' + bad.map((l: any) => l.lane).join(',') : ''}`);
for (const s of SETTINGS.slice(1)) {
  const ps = out.lanes.map((l: any) => l.passes.find((q: any) => q.label === s.label));
  const dt = out.lanes.reduce((n: number, l: any) => n + l.passes[0].tokens, 0);
  const t = ps.reduce((n: number, q: any) => n + q.tokens, 0);
  const m = ps.reduce((n: number, q: any) => n + q.ms, 0);
  const dm = out.lanes.reduce((n: number, l: any) => n + l.passes[0].ms, 0);
  const worse = out.lanes.filter((l: any) => l.passes.find((q: any) => q.label === s.label).tokens > l.passes[0].tokens)
    .map((l: any) => `${l.lane}(+${l.passes.find((q: any) => q.label === s.label).tokens - l.passes[0].tokens})`);
  const shaDiff = out.lanes.filter((l: any) => l.passes.find((q: any) => q.label === s.label).sha !== l.passes[0].sha).map((l: any) => l.lane);
  const inexact = ps.filter((q: any) => !q.exact).length;
  console.log(`  ${s.label.padEnd(8)} w=${s.w} c=${s.c}  tokens ${t} (${t - dt >= 0 ? '+' : ''}${t - dt})  ms ${m} vs ${dm} = x${(dm / m).toFixed(2)}  sha-differing ${shaDiff.length}${shaDiff.length ? ' [' + shaDiff.join(',') + ']' : ''}  lanes-worse ${worse.length}${worse.length ? ' [' + worse.join(' ') + ']' : ''}  INEXACT ${inexact}`);
}
out.summary = { controlInvalid: bad.map((l: any) => l.lane), elapsedMs: Date.now() - t0 };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
