// X59 BATHMOS red-team runner (plan level).
import * as fs from 'node:fs';
import { bathmosPlan, bathmosRestore } from '../../../src/lib/omega/bathmos';
const DIR = 'bench/x59/redteam/cases';
const manifest = JSON.parse(fs.readFileSync(`${DIR}/manifest.json`, 'utf8')) as { name: string; expect: string }[];
let pass = 0, fail = 0;
const fails: string[] = [];
for (const c of manifest) {
  const text = fs.readFileSync(`${DIR}/${c.name}.csv`, 'utf8');
  let plan = null as ReturnType<typeof bathmosPlan>;
  let err: string | null = null;
  try { plan = bathmosPlan(text, 'o200k_base'); } catch (e) { err = String(e); }
  let ok = false;
  if (!err && c.expect === 'apply') ok = !!plan && bathmosRestore(plan.reducedText, plan.spec) === text;
  else if (!err && c.expect === 'refuse') ok = !plan;
  else if (!err && c.expect === 'any') ok = !plan || bathmosRestore(plan.reducedText, plan.spec) === text;
  if (ok) pass++; else { fail++; fails.push(`${c.name} expect=${c.expect} applied=${!!plan} err=${err}`); }
  if (plan) { fs.writeFileSync(`${DIR}/${c.name}.contract.txt`, plan.contract); fs.writeFileSync(`${DIR}/${c.name}.reduced.txt`, plan.reducedText); }
}
console.log(JSON.stringify({ pass, fail, fails }, null, 1));
