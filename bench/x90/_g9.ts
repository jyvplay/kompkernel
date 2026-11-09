/** Bracket the G9 threshold from data: for every relation that reaches G1 support, report
 *  how many distinct values its SOURCE cell takes, with G9 disabled. */
import * as fs from 'node:fs'; import * as path from 'node:path';
import { symphyiaFit } from '../../src/lib/omega/symphyia';
const files: string[] = [];
for (const d of fs.readdirSync('bench').filter((x) => x.startsWith('holdout'))) { const dir='bench/'+d; if (fs.statSync(dir).isDirectory()) for (const f of fs.readdirSync(dir)) files.push(path.join(dir,f)); }
const out: any[] = [];
for (const p of files.sort()) {
  const text = fs.readFileSync(p,'utf8');
  const fit = symphyiaFit(text);
  for (const r of fit.rules) out.push({ lane: p.split('/').pop(), rel: `f${r.j}:${r.form}<-f${r.i}`, rows: r.rows, eligible: r.eligible, distinctSource: r.distinctSource, A: r.A.slice(0,20), B: r.B.slice(0,20) });
}
out.sort((a,b)=>a.distinctSource-b.distinctSource);
console.log('distinctSource  rows/elig  relation            lane');
for (const r of out) console.log(`${String(r.distinctSource).padStart(6)}          ${String(r.rows).padStart(4)}/${String(r.eligible).padEnd(4)}  ${r.rel.padEnd(18)}  ${r.lane}  A=${JSON.stringify(r.A)} B=${JSON.stringify(r.B)}`);
console.log(`\nrelations reaching G1 support with G9 OFF: ${out.length}`);
