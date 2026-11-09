/** X86 screen — which real lanes does the gap vote give ΚΕΝΟΝ a byte-exact grid for?
 *
 *  No frontier calls: `kenonPlanOnly` is the cheap half. Identity token counts are
 *  read from the X80 frontier receipt when the lane is in it, so the screen never
 *  re-derives a number it can cite. Lanes NOT in that receipt report `F=?` and are
 *  measured for real by `verify.ts`.
 */
import * as fs from 'node:fs';
import { kenonBounds, kenonPlanOnly, kenonDecode } from '../../src/lib/omega/kenon';
import { countTokens } from '../../src/lib/omega/bpe';
import { kannabosPlan, kannabosDecode } from '../../src/lib/omega/kannabos';

const receipt = JSON.parse(fs.readFileSync('bench/x80/receipts/frontier.json', 'utf8'));
const F = new Map<string, { tokens: number; raw: number; parent: string }>();
for (const r of receipt.rows) F.set(r.path, { tokens: r.tokens, raw: r.raw, parent: r.parent });

const lanes = process.argv.slice(2);
const out: any[] = [];
console.log(
  'lane'.padEnd(24) + 'raw'.padStart(6) + 'F'.padStart(6) + '  vote k  bounds[support]'.padEnd(4) +
  '  plan(cols/rows/lit)  wireRaw clauseRaw  decode',
);
for (const p of lanes) {
  let S: string;
  try { S = fs.readFileSync(p, 'utf8'); } catch { console.log(p + ' MISSING'); continue; }
  const name = p.split('/').pop()!;
  const f = F.get(p);
  const v = kenonBounds(S, 0.6);
  const raw = countTokens(S, 'o200k_base');
  const plan = kenonPlanOnly(S, 'o200k_base');
  // For contrast: what KANNABOS's own histogram-driven candidate list finds.
  let hist: any = null;
  try { hist = kannabosPlan(S, 'o200k_base'); } catch { hist = null; }
  const histOk = hist ? kannabosDecode(hist.text) === S : false;
  const row = {
    lane: name, path: p, bytes: S.length, raw,
    frontierTokens: f?.tokens ?? null, frontierParent: f?.parent ?? null,
    voteBounds: v?.bounds ?? [], voteSupport: v?.support ?? [], voteK: (v?.bounds.length ?? 0) + 1,
    plan: plan ? { cols: plan.plan.cols, rows: plan.plan.rows, literals: plan.plan.literals,
      wireRaw: countTokens(plan.plan.text, 'o200k_base'),
      clauseRaw: countTokens(plan.clause, 'o200k_base'),
      exact: kenonDecode(plan.clause + '\n' + plan.plan.text) === S } : null,
    kannabosAlone: histOk ? { cols: hist.cols, rows: hist.rows, literals: hist.literals } : null,
  };
  out.push(row);
  console.log(
    name.padEnd(24) + String(raw).padStart(6) + String(f?.tokens ?? '?').padStart(6) +
    `  k=${row.voteK} [${(v?.bounds ?? []).join(',')}]  ` +
    (plan ? `cols=${plan.plan.cols} rows=${plan.plan.rows} lit=${plan.plan.literals}  ` +
      `${String(row.plan!.wireRaw).padStart(5)} ${String(row.plan!.clauseRaw).padStart(5)}  ` +
      `${row.plan!.exact ? 'EXACT' : 'FAIL'}` : 'NO PLAN') +
    (row.kannabosAlone ? `   | histogram-alone: cols=${row.kannabosAlone.cols}` : '   | histogram-alone: none'),
  );
}
fs.mkdirSync('bench/x86/receipts', { recursive: true });
fs.writeFileSync('bench/x86/receipts/screen.json', JSON.stringify({ rows: out }, null, 1) + '\n');
const n = out.filter((r) => r.plan).length;
const fresh = out.filter((r) => r.plan && !r.kannabosAlone).length;
console.log(`\nlanes=${out.length}  with-a-grid=${n}  grid-KANNABOS-ALONE-COULD-NOT-FIND=${fresh}`);
for (const r of out.filter((r) => r.plan && !r.kannabosAlone)) {
  console.log(`  ${r.lane.padEnd(24)} cols=${r.plan.cols} bounds=[${r.voteBounds.join(',')}]`);
}
