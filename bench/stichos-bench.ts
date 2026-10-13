/**
 * bench/stichos-bench.ts — STICHOS measured on every real text file reachable
 * in this checkout (repo holdouts + node_modules docs). Wins AND losses printed.
 * Incumbent here = min(raw, CHIRON) only (fast). The full registry tournament
 * is NOT rerun by this script; STICHOS is also registered in registry.ts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { stichosEncode, stichosStackDecode, stichosSelfTest } from '../src/lib/omega/stichos';
import { chironEncode } from '../src/lib/omega/chiron';

const ENC: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);

const files: Array<[string, string]> = [];
for (const d of ['bench/holdout', 'bench/holdout-work', 'bench/holdout-ops', 'bench/holdout-tbl', 'bench/holdout-mk', 'bench/holdout-lang']) {
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).sort()) files.push([`${d}/${f}`, fs.readFileSync(path.join(d, f), 'utf8')]);
}
// real third-party docs: text-ish files in node_modules
const walk = (dir: string, depth: number) => {
  if (depth > 6 || !fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, depth + 1);
    else if (/\.(md|txt|markdown)$/i.test(e.name) || /^(LICENSE|LICENCE|NOTICE|AUTHORS|CHANGELOG)/i.test(e.name)) {
      const st = fs.statSync(p);
      if (st.size >= 400 && st.size <= 12000) {
        try { files.push([p, fs.readFileSync(p, 'utf8')]); } catch { /* skip */ }
      }
    }
  }
};
walk('node_modules', 0);

console.log('STICHOS self-test:');
for (const r of stichosSelfTest(ENC)) console.log(`  ${r.ok ? 'PASS' : 'FAIL'} ${r.name} — ${r.detail}`);

let stackedWins = 0; let n = 0, applicable = 0, wins = 0, losses = 0, rawSum = 0, bestSum = 0, stSum = 0, chSum = 0, exactFail = 0;
const winRows: string[] = [];
const lossRows: string[] = [];
for (const [name, text] of files) {
  n++;
  const raw = T(text);
  const t0 = Date.now();
  const r = stichosEncode(text, ENC);
  if (files.length && n % 25 === 0) console.error(`progress ${n}/${files.length} ${name} ${Date.now()-t0}ms`);
  if (stichosStackDecode(r.wire) !== text) { exactFail++; continue; }
  if (r.winner === 'raw') continue;
  if (r.winner === 'stichos-chiron') stackedWins++;
  applicable++;
  let ch = raw;
  try { const c = chironEncode(text, ENC, { budgetMs: 4000 }) as any; if (c.decoded === text) ch = Math.min(raw, c.messageTokens); } catch { /* keep raw */ }
  const best = Math.min(raw, ch);
  rawSum += raw; bestSum += best; stSum += r.messageTokens; chSum += ch;
  const row = `${name.padEnd(74)} raw=${String(raw).padStart(5)} chiron/raw-best=${String(best).padStart(5)} stichos=${String(r.messageTokens).padStart(5)} W=${r.width} Δvsbest=${r.messageTokens - best}`;
  if (r.messageTokens + 3 < best) { wins++; winRows.push(row); }
  else { losses++; lossRows.push(row); }
}
console.log(`\nfiles scanned=${n}  STICHOS-applicable(greedy-consistent)=${applicable}  exact-decode-failures=${exactFail}`);
console.log(`applied (winner≠raw)=${applicable} of which STICHOS→CHIRON stack=${stackedWins}`);
console.log(`strict wins (M+3 < best incumbent)=${wins}   non-wins=${losses}`);
if (applicable) {
  console.log(`applicable-set totals: raw=${rawSum}  incumbent(min raw,CHIRON)=${bestSum}  STICHOS=${stSum}  Δ vs incumbent=${stSum - bestSum} (${(((bestSum - stSum) / bestSum) * 100).toFixed(2)}% smaller)`);
}
console.log('\nWINS:'); for (const w of winRows) console.log('  ' + w);
console.log('NON-WINS:'); for (const l of lossRows) console.log('  ' + l);
