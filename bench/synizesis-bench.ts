/**
 * bench/synizesis-bench.ts — head-to-head, real tokenizer, every arm decoded
 * and compared byte-for-byte.  Baseline = DAEDALUS (the incumbent dictionary
 * lane that METATRON itself routes to on nearly every structured document).
 */
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { synizesisEncode, synPlan, renderSynWire, synizesisDecode, synContract } from '../src/lib/omega/synizesis';
import { daedalusEncode } from '../src/lib/omega/daedalus';
import { allFixtures } from './synizesis-fixtures';
const ENC: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);
const BUDGET = Number(process.env.BUDGET ?? 3000);

const fx = allFixtures();
console.log('fixture'.padEnd(28), 'kind'.padEnd(9), 'raw'.padStart(6), 'bare'.padStart(6), 'DAED'.padStart(6), 'SYNIZESIS'.padStart(9), 'Δ'.padStart(6), 'Δ%'.padStart(6), 'winner'.padEnd(20), 'ms'.padStart(6));
let R = 0, D = 0, S = 0;
const rows: Array<{ n: string; kind: string; raw: number; d: number; s: number }> = [];
for (const f of fx) {
  const raw = T(f.text);
  let bare = raw;
  try { const p = synPlan(f.text, ENC); if (p) { const w = renderSynWire(p); if (synizesisDecode(w) === f.text) bare = Math.min(raw, T(w) + T(synContract(p))); } } catch {}
  let d = raw;
  try { const r = daedalusEncode(f.text, ENC, { budgetMs: BUDGET }); if (r.decoded === f.text) d = Math.min(raw, r.messageTokens); } catch {}
  const t0 = Date.now();
  const s = synizesisEncode(f.text, ENC, { budgetMs: BUDGET });
  const ms = Date.now() - t0;
  if (s.decoded !== f.text) throw new Error('NOT EXACT: ' + f.name);
  R += raw; D += d; S += Math.min(s.messageTokens, d);
  rows.push({ n: f.name, kind: f.kind, raw, d, s: s.messageTokens });
  console.log(f.name.padEnd(28), f.kind.padEnd(9), String(raw).padStart(6), String(bare).padStart(6), String(d).padStart(6), String(s.messageTokens).padStart(9), String(d - s.messageTokens).padStart(6), (((d - s.messageTokens) / d) * 100).toFixed(1).padStart(6), s.winner.padEnd(20), String(ms).padStart(6));
}
console.log('-'.repeat(130));
console.log('TOTAL'.padEnd(38), String(R).padStart(6), ''.padStart(6), String(D).padStart(6), String(S).padStart(9), String(D - S).padStart(6), (((D - S) / D) * 100).toFixed(2).padStart(6));
for (const k of ['tab', 'synth', 'ops-real', 'holdout']) {
  const g = rows.filter((r) => (k === 'tab' ? r.n.startsWith('tab/') : r.kind === k && !r.n.startsWith('tab/')));
  if (!g.length) continue;
  const r = g.reduce((a, b) => a + b.raw, 0), d = g.reduce((a, b) => a + b.d, 0), s = g.reduce((a, b) => a + Math.min(b.s, b.d), 0);
  console.log(`  [${k.padEnd(8)}] raw=${r} DAEDALUS=${d} (${((r - d) / r * 100).toFixed(1)}%) SYNIZESIS=${s} (${((r - s) / r * 100).toFixed(1)}%)  Δ=${d - s} (${((d - s) / d * 100).toFixed(1)}% of incumbent)`);
}
const wins = rows.filter((r) => r.s < r.d);
console.log(`lanes improved: ${wins.length}/${rows.length}; largest: ${wins.sort((a,b)=>(b.d-b.s)-(a.d-a.s)).slice(0,6).map(w=>`${w.n} ${w.d}->${w.s}`).join(', ')}`);
