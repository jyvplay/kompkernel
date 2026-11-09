/** X89 — DO THE WORK BUDGETS BIND?  The only speed lever left that could be sound.
 *
 *  bench/x89/phases.ts measured where the shipped encoder's time goes: 87-98% of it is
 *  `tagstackEncodeInner`, the nine-parent frontier competition, and the sub-encode
 *  redundancy inside that competition was already removed by ENGRAMMA (X68), which
 *  memoises `daedalusEncode` on (codec, enc, options, text) and replays the counted work
 *  so a cache hit cannot hand its caller free budget (X67's bug: DIASTEMA went 36.5s ->
 *  49.9s with a result-only cache). PROSPHYSIS is the only other discardable cost and it
 *  is 13% on one lane.
 *
 *  So the remaining question is whether the two integer budgets that bound the search --
 *  `workBudgetFor` = 2M + 100/char and `chironBudgetFor` = 4M + 500/char, both already
 *  overridable by OMEGA_WORK_BUDGET / OMEGA_CHIRON_BUDGET -- are BINDING. If the searches
 *  stop because the meter runs out, a smaller meter is a real speed change but it can also
 *  change the wire. If the searches end naturally, a smaller meter changes nothing at all,
 *  including the time, and no speed is available this way.
 *
 *  The test is the one ENGRAMMA's identity receipts use: encode the same text at 1x and at
 *  a reduced budget in the SAME process and compare the complete message by SHA-256, not by
 *  token count -- two different wires can share a token count. The sub-encode memo is
 *  disabled (OMEGA_ENGRAM=0) so the second pass cannot be a replay, and the run is under
 *  OMEGA_DET=1 so the wall clock cannot be the thing that differs between passes.
 *
 *  Reported per pass: message tokens, SHA-256 of the complete message, wall ms, and the
 *  last epoch's counted spend against its budget. `workLastEpochUsed` is the LAST parent's
 *  spend, not the sum over nine parents, so it is an indicator of binding, not a total. */
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { tagstackEncodeUncached } from '../../src/lib/omega/tagstack';
import { workBudgetFor, chironBudgetFor, workLastEpochUsed, chironLastEpochUsedUnits } from '../../src/lib/omega/workmeter';

const enc = 'o200k_base' as any;
const sha = (s: string) => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);

function pass(label: string, text: string, mult: number | null) {
  const chars = text.length;
  const wb = workBudgetFor(chars), cb = chironBudgetFor(chars);
  if (mult === null) { delete process.env.OMEGA_WORK_BUDGET; delete process.env.OMEGA_CHIRON_BUDGET; }
  else { process.env.OMEGA_WORK_BUDGET = String(Math.round(wb * mult)); process.env.OMEGA_CHIRON_BUDGET = String(Math.round(cb * mult)); }
  const t = Date.now();
  const r: any = tagstackEncodeUncached(text, enc);
  const ms = Date.now() - t;
  const wu = workLastEpochUsed(), cu = chironLastEpochUsedUnits();
  const row = {
    label, mult, ms, tokens: r.messageTokens, sha: sha(r.message), parent: r.parentCodec, exact: r.decoded === text,
    workBudget: workBudgetFor(chars), chironBudget: chironBudgetFor(chars),
    lastEpochWorkUsed: wu, lastEpochChironUsed: cu,
    workBindingPct: +(100 * wu / workBudgetFor(chars)).toFixed(1),
    chironBindingPct: +(100 * cu / chironBudgetFor(chars)).toFixed(1),
  };
  console.log(`  ${label.padEnd(10)} tokens=${String(row.tokens).padStart(5)} sha=${row.sha} parent=${String(row.parent).padEnd(12)} exact=${row.exact} ms=${String(ms).padStart(7)}  workBudget=${String(row.workBudget).padStart(10)} lastEpochUsed=${String(wu).padStart(9)} (${row.workBindingPct}%)  chironBudget=${String(row.chironBudget).padStart(10)} used=${String(cu).padStart(10)} (${row.chironBindingPct}%)`);
  return row;
}

const MULTS = [null, 0.5, 0.25, 0.1];
const out: any = { det: process.env.OMEGA_DET ?? null, engram: process.env.OMEGA_ENGRAM ?? null, lanes: [] };
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const lane = p.split('/').pop();
  console.log(`\n━━ ${lane}  ${text.length} chars`);
  const rows = MULTS.map((m) => pass(m === null ? 'default' : `x${m}`, text, m));
  const base = rows[0];
  for (const r of rows.slice(1)) {
    r.identical = r.sha === base.sha;
    r.speedup = +(base.ms / r.ms).toFixed(2);
    console.log(`     x${r.mult}: message ${r.identical ? 'IDENTICAL (sha match)' : 'DIFFERENT'} · tokens ${base.tokens} -> ${r.tokens} · ${base.ms}ms -> ${r.ms}ms · speedup ${r.speedup}x`);
  }
  out.lanes.push({ lane, chars: text.length, rows });
  fs.mkdirSync('bench/x89/receipts', { recursive: true });
  fs.writeFileSync('bench/x89/receipts/budget.json', JSON.stringify(out, null, 1) + '\n');
}
const ident = out.lanes.flatMap((l: any) => l.rows.slice(1)).filter((r: any) => r.identical).length;
const tot = out.lanes.flatMap((l: any) => l.rows.slice(1)).length;
console.log(`\n=== VERDICT over ${out.lanes.length} lanes x ${MULTS.length - 1} reduced budgets ===`);
console.log(`messages byte-identical to the default-budget message: ${ident}/${tot}`);
const fastest = out.lanes.flatMap((l: any) => l.rows.slice(1)).filter((r: any) => r.identical).sort((a: any, b: any) => b.speedup - a.speedup)[0];
console.log(fastest ? `best identical-output speedup: x${fastest.speedup} at multiplier ${fastest.mult}` : 'no reduced budget reproduced the message, so no sound speed gain is available from these knobs');
