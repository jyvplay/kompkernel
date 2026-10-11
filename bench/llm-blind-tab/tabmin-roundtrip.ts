import fs from 'node:fs';
import path from 'node:path';
import { tabminEncode, parseTable } from '../../src/lib/omega/tabmin';
const roots = ['bench/tmp/csvcorpus', 'bench/llm-blind-tab/hidden', 'bench/llm-blind-tab/hidden2'];
const files: string[] = [];
for (const r of roots) if (fs.existsSync(r)) for (const f of fs.readdirSync(r)) if (f.endsWith('.csv')) files.push(path.join(r, f));
let n = 0, exact = 0, col = 0, row = 0, inelig = 0, saved = 0, base = 0; const fails: string[] = [];
const SH=Number(process.env.SHARD||0), NS=Number(process.env.NSHARD||1); let idx=-1;
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  if (!parseTable(t)) { inelig++; continue; }
  idx++; if (idx % NS !== SH) continue;
  const t0 = Date.now();
  const r = tabminEncode(t, 'o200k_base');
  n++;
  if (r.arm === 'column') col++; else row++;
  if (r.exact && r.decoded === t) exact++; else fails.push(f);
  base += r.inTokens; saved += r.inTokens - r.messageTokens;
  console.log(`${n} ${f} arm=${r.arm} exact=${r.exact} in=${r.inTokens} msg=${r.messageTokens} ${Date.now()-t0}ms`);
}
console.log(JSON.stringify({ rectangular: n, exact, fails: fails.slice(0, 5), column: col, row, ineligible: inelig, inTokens: base, savedTokens: saved, pct: +(100 * saved / base).toFixed(2) }));
