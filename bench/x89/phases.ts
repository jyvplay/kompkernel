/** X89 — WHERE THE TIME GOES.  Every previous speed hypothesis in this project was
 *  falsified because it was argued instead of measured (bpe memo budget: no gain;
 *  countTokens: not the bottleneck; runs C/D/E "speedups": cross-process drift). This
 *  script measures the shipped encoder's own phases directly, one lane at a time, under
 *  OMEGA_DET=1 so the numbers describe the work and not the machine load.
 *
 *  The suspicion is structural, from reading src/lib/omega/tagstack.ts:625-630 rather
 *  than from a profile: tagstackX74Chain runs tagstackEncodeInner (the frontier), then
 *  STICHOMYTHIA, then PROSPHYSIS and STOICHEION -- and PROSPHYSIS "re-encodes the
 *  rewritten text through this same frontier", so one call to the shipped encoder can pay
 *  for the frontier search two or three times. STOICHEION is documented as losing on
 *  every lane of this corpus, and it "stays in the chain because it costs one call"; if
 *  that one call is a full frontier re-encode, the chain is paying a frontier for a
 *  guaranteed refusal. That is a sound place to look for a speed win that cannot change
 *  any output: skipping work whose result is discarded. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncodeUncached } from '../../src/lib/omega/tagstack';
import { stichomythiaEncode } from '../../src/lib/omega/stichomythia';
import { prosphysisEncode } from '../../src/lib/omega/prosphysis';
import { stoicheionEncode } from '../../src/lib/omega/stoicheion';
const enc = 'o200k_base' as any;
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const lane = p.split('/').pop();
  const ph: any = { lane, raw: countTokens(text, enc) };
  let t = Date.now(); const base: any = tagstackEncodeUncached(text, enc); ph.baseMs = Date.now() - t;
  t = Date.now(); const st: any = stichomythiaEncode(text, enc); ph.stichMs = Date.now() - t;
  t = Date.now(); let pr: any = null; try { pr = prosphysisEncode(text, enc); } catch { } ph.prosMs = Date.now() - t;
  t = Date.now(); let so: any = null; try { so = stoicheionEncode(text, enc); } catch { } ph.stoiMs = Date.now() - t;
  ph.baseTokens = base.messageTokens; ph.stichApplied = !!st.applied; ph.stichTokens = st.messageTokens;
  ph.prosApplied = !!(pr && pr.applied); ph.prosTokens = pr ? pr.messageTokens : null;
  ph.stoiApplied = !!(so && so.applied); ph.stoiTokens = so ? so.messageTokens : null;
  ph.totalMs = ph.baseMs + ph.stichMs + ph.prosMs + ph.stoiMs;
  rows.push(ph);
  console.log(`${lane!.padEnd(26)} raw=${String(ph.raw).padStart(5)} base=${String(ph.baseTokens).padStart(5)} | ms: base=${String(ph.baseMs).padStart(6)} stich=${String(ph.stichMs).padStart(6)} pros=${String(ph.prosMs).padStart(6)} stoi=${String(ph.stoiMs).padStart(6)} TOTAL=${String(ph.totalMs).padStart(6)}`);
  console.log(`${''.padEnd(26)} applied: stich=${ph.stichApplied}(${ph.stichTokens}) pros=${ph.prosApplied}(${ph.prosTokens}) stoi=${ph.stoiApplied}(${ph.stoiTokens})   discarded-work share=${(100 * (ph.stoiMs + (ph.prosApplied ? 0 : ph.prosMs)) / ph.totalMs).toFixed(1)}%`);
  fs.mkdirSync('bench/x89/receipts', { recursive: true });
  fs.writeFileSync('bench/x89/receipts/phases.json', JSON.stringify({ det: process.env.OMEGA_DET ?? null, rows }, null, 1) + '\n');
}
const sum = (k: string) => rows.reduce((a, r) => a + r[k], 0);
console.log(`\n=== phase totals over ${rows.length} lanes ===`);
for (const k of ['baseMs', 'stichMs', 'prosMs', 'stoiMs']) console.log(`  ${k.padEnd(8)} ${String(sum(k)).padStart(8)} ms  (${(100 * sum(k) / sum('totalMs')).toFixed(1)}%)`);
console.log(`  TOTAL    ${String(sum('totalMs')).padStart(8)} ms`);
const stoiWins = rows.filter((r) => r.stoiApplied && r.stoiTokens < r.baseTokens).length;
console.log(`  STOICHEION admitted on ${stoiWins}/${rows.length} lanes but consumed ${sum('stoiMs')} ms (${(100 * sum('stoiMs') / sum('totalMs')).toFixed(1)}% of the shipped encoder)`);
