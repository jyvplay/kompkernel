/** X89 — IS THE 0.25x BUDGET A SOUND WHOLE-STACK SPEED GAIN?  All 29 frontier lanes.
 *
 *  bench/x89/budget.ts found, on two lanes, that the CHIRON work meter binds at exactly
 *  100% of its allowance on every pass while the ARIADNE/DAEDALUS meter binds at 19.9% and
 *  64.6% -- so CHIRON is the binding constraint and the defaults are over-provisioned. At
 *  0.25x of both budgets the complete message was BYTE-IDENTICAL (SHA-256 of the whole
 *  message, not the token count, because two different wires can share a count) and the
 *  encoder ran 2.39x and 2.77x faster. At 0.1x the message changed on both lanes
 *  (419 -> 445, 969 -> 976), so there is a cliff between 0.25x and 0.1x and 0.25x is not
 *  an arbitrarily safe margin.
 *
 *  METHOD, chosen to control the two things that have falsified speed claims here before:
 *   · INTERLEAVED IN ONE PROCESS, lane by lane, default pass immediately followed by the
 *     reduced pass. Cross-process drift on this box is ~1.6x (runs C/D/E looked like
 *     speedups and were not), so a ratio measured across processes is not a measurement.
 *   · OMEGA_ENGRAM=0. With the sub-encode memo live, the second pass would replay the
 *     first pass's cached result and report a fictional speedup. The memo is also the reason
 *     a production ship needs its own separate-process identity check: ENGRAMMA replays the
 *     COUNTED WORK of the original computation, and a spend recorded at 1x can exceed a
 *     reduced budget, so memo-on behaviour is not implied by memo-off behaviour.
 *   · OMEGA_DET=1, so the wall clock is not the thing that differs between the two passes.
 *   · byte-exactness is re-checked at every pass; a faster encoder that stops being exact
 *     is not a speedup. */
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncodeUncached } from '../../src/lib/omega/tagstack';
import { workBudgetFor, chironBudgetFor, workLastEpochUsed, chironLastEpochUsedUnits } from '../../src/lib/omega/workmeter';

const enc = 'o200k_base' as any;
const sha = (s: string) => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
const SETTINGS: { label: string; mult: number }[] = [
  { label: 'default', mult: 1 }, { label: 'x0.5', mult: 0.5 }, { label: 'x0.25', mult: 0.25 }];
const rows: any[] = [];
const t0 = Date.now();
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const lane = p.split('/').pop()!;
  const chars = text.length;
  const per: any = { lane, path: p, chars, raw: countTokens(text, enc), passes: [] };
  for (const s of SETTINGS) {
    if (s.mult === 1) { delete process.env.OMEGA_WORK_BUDGET; delete process.env.OMEGA_CHIRON_BUDGET; }
    else { process.env.OMEGA_WORK_BUDGET = String(Math.round(workBudgetFor(chars) * s.mult));
           process.env.OMEGA_CHIRON_BUDGET = String(Math.round(chironBudgetFor(chars) * s.mult)); }
    const t = Date.now();
    const r: any = tagstackEncodeUncached(text, enc);
    const pass = { label: s.label, mult: s.mult, ms: Date.now() - t, tokens: r.messageTokens, sha: sha(r.message),
      parent: r.parentCodec, exact: r.decoded === text,
      workBindingPct: +(100 * workLastEpochUsed() / workBudgetFor(chars)).toFixed(1),
      chironBindingPct: +(100 * chironLastEpochUsedUnits() / chironBudgetFor(chars)).toFixed(1) };
    per.passes.push(pass);
  }
  delete process.env.OMEGA_WORK_BUDGET; delete process.env.OMEGA_CHIRON_BUDGET;
  const a = per.passes[0];
  per.exactBoth = per.passes.every((q: any) => q.exact);
  per.identical = per.passes.every((q: any) => q.sha === a.sha);
  per.msDefault = a.ms; per.tokensDefault = a.tokens;
  for (const q of per.passes.slice(1)) { per['ms' + q.label] = q.ms; per['ident' + q.label] = q.sha === a.sha; per['tok' + q.label] = q.tokens; }
  rows.push(per);
  console.log(`${lane.padEnd(24)} ch=${String(chars).padStart(5)} F=${String(a.tokens).padStart(5)} exact=${per.exactBoth} | x0.5: ${per.passes[1].sha === a.sha ? 'SAME' : 'DIFF ' + per.passes[1].tokens} ${String(per.passes[1].ms).padStart(6)}ms (${(a.ms / per.passes[1].ms).toFixed(2)}x) | x0.25: ${per.passes[2].sha === a.sha ? 'SAME' : 'DIFF ' + per.passes[2].tokens} ${String(per.passes[2].ms).padStart(6)}ms (${(a.ms / per.passes[2].ms).toFixed(2)}x) | chironBind=${a.chironBindingPct}%`);
  fs.mkdirSync('bench/x89/receipts', { recursive: true });
  fs.writeFileSync('bench/x89/receipts/budget29.json', JSON.stringify({ det: process.env.OMEGA_DET ?? null, engram: process.env.OMEGA_ENGRAM ?? null,
    method: 'interleaved default-then-reduced in one process, OMEGA_ENGRAM=0, OMEGA_DET=1, SHA-256 of the complete message',
    rows, identical: rows.filter(r => r.identical).length, lanes: rows.length, msDefault: rows.reduce((s, r) => s + r.msDefault, 0) }, null, 1) + '\n');
}
const md = rows.reduce((s, r) => s + r.msDefault, 0);
console.log(`\n=== VERDICT: ${rows.length} lanes, default vs 0.5x vs 0.25x, one process, memo off, det on ===`);
console.log(`byte-exact decode at every setting: ${rows.filter((r) => r.exactBoth).length}/${rows.length}`);
for (const s of SETTINGS.slice(1)) {
  const k = s.label, ms = rows.reduce((a, r) => a + (r['ms' + k] ?? 0), 0);
  const id = rows.filter((r) => r['ident' + k]).length;
  console.log(`  ${k.padEnd(6)} identical message ${String(id).padStart(2)}/${rows.length}   total ${String(ms).padStart(7)} ms   speedup ${(md / ms).toFixed(2)}x`);
  if (id < rows.length) for (const r of rows.filter((x) => !x['ident' + k])) console.log(`       CHANGED ${r.lane}: ${r.tokensDefault} -> ${r['tok' + k]}`);
}
console.log(`default total ${md} ms   elapsed ${Date.now() - t0} ms`);
