// Z49: run PARADEIGMA vs DAEDALUS on files; print clause and numbers. Usage: try.ts [--show] files...
import fs from 'node:fs';
import { paradeigmaEncode, induce } from '@/lib/omega/paradeigma';
const enc = 'o200k_base' as const;
const show = process.argv.includes('--show');
const forced = process.argv.includes('--force');
for (const f of process.argv.slice(2).filter(a => !a.startsWith('--'))) {
  const text = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = paradeigmaEncode(text, enc, { force: forced });
  console.log(r.notes.slice(0, 300)); console.log(`${f.split("/").pop()}\traw=${r.inTokens}\tplainM=${r.plainMessageTokens}\tM=${r.messageTokens}\tapplied=${r.applied}\texact=${r.exact}\ttemplates=${r.templates}\tlines=${r.elidedLines}\tclause=${r.clauseTokens}\t${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (show) { const ind = induce(text, 2); if (ind) { console.log(r.wire.split('\n')[0]); console.log('--- reduced head ---'); console.log(ind.reduced.split('\n').slice(0, 30).join('\n')); } }
}
