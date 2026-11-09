/** Write the ΚΕΝΟΝ message (contract + columnar wire) for each lane, so an
 *  INDEPENDENT reader — `bench/kenon_decode.py`, CPython — can be run on it cold. */
import * as fs from 'node:fs';
import { kenonPlanOnly } from '../../src/lib/omega/kenon';
fs.mkdirSync('bench/x86/receipts/msg', { recursive: true });
const out: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const g = kenonPlanOnly(S, 'o200k_base');
  const name = p.split('/').pop()!.replace(/\.txt$/, '');
  if (!g) { console.log(name.padEnd(22) + ' no plan'); out.push({ lane: name, plan: false }); continue; }
  const msg = g.clause + '\n' + g.plan.text;
  const f = `bench/x86/receipts/msg/${name}.msg.txt`;
  fs.writeFileSync(f, msg, 'utf8');
  fs.writeFileSync(`bench/x86/receipts/msg/${name}.src.txt`, S, 'utf8');
  out.push({ lane: name, plan: true, cols: g.plan.cols, rows: g.plan.rows, literals: g.plan.literals,
    bounds: g.bounds, support: g.support, k: g.k, msgChars: msg.length, srcChars: S.length, msg: f });
  console.log(name.padEnd(22) + ` cols=${g.plan.cols} rows=${g.plan.rows} lit=${g.plan.literals} msg=${msg.length}ch src=${S.length}ch -> ${f}`);
}
fs.writeFileSync('bench/x86/receipts/messages.json', JSON.stringify({ rows: out }, null, 1) + '\n');
