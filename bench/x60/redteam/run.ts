// X60 EIRMOS red-team runner (plan level).
import * as fs from 'node:fs';
import { eirmosApplyTransform, eirmosPlan, eirmosRestore } from '../../../src/lib/omega/eirmos';
const DIR = 'bench/x60/redteam/cases';
const manifest = JSON.parse(fs.readFileSync(`${DIR}/manifest.json`, 'utf8')) as { name: string; expect: string }[];
let pass = 0, fail = 0;
const fails: string[] = [];
const applied: string[] = [];
for (const c of manifest) {
  const text = fs.readFileSync(`${DIR}/${c.name}.csv`, 'utf8');
  let plan = null as ReturnType<typeof eirmosPlan>;
  let err: string | null = null;
  try { plan = eirmosPlan(text, 'o200k_base'); } catch (e) { err = String(e); }
  let ok = false;
  if (!err && c.expect === 'apply') ok = !!plan && eirmosRestore(plan.reducedText, plan.spec) === text;
  else if (!err && c.expect === 'refuse') ok = !plan;
  else if (!err && c.expect === 'any') ok = !plan || eirmosRestore(plan.reducedText, plan.spec) === text;
  if (ok) pass++; else { fail++; fails.push(`${c.name} expect=${c.expect} applied=${!!plan} err=${err}`); }
  if (plan) { applied.push(c.name); fs.writeFileSync(`${DIR}/${c.name}.contract.txt`, plan.contract); fs.writeFileSync(`${DIR}/${c.name}.reduced.txt`, plan.reducedText); }
}
const astralExpected = '😀😁';
const astralActual = eirmosApplyTransform('first2', '😀😁TAIL');
const initialActual = eirmosApplyTransform('initial', '😀TAIL');
if (astralActual !== astralExpected || initialActual !== '😀') {
  fail++; fails.push(`unicode-codepoint-transform expected=${JSON.stringify(astralExpected)} got=${JSON.stringify(astralActual)}`);
} else pass++;
console.log(JSON.stringify({ pass, fail, fails, applied, transformChecks: { astralActual, initialActual } }, null, 1));
