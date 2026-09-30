/**
 * bench/pinax-redteam.ts — adversarial + economic audit for PINAX-▦.
 * Run: npx tsx bench/pinax-redteam.ts
 *
 * Gates (all must hold):
 *  - EXACTNESS: pinaxDecode(wire) === input for every case (0 failures).
 *  - HONESTY: applied ⇒ messageTokens < inTokens (contract-inclusive).
 *  - NO REGRESSION: !applied ⇒ wire === input (pure identity).
 *  - REAL GAINS: record payloads show large contract-inclusive savings.
 *  - FUZZ: random JSONL/JSON-array records (string/number/bool/null, constant &
 *    varying columns, spaced & compact) round-trip byte-exact.
 */
import { encode as enc200 } from 'gpt-tokenizer/encoding/o200k_base';
import { pinaxEncode, pinaxDecode, PINAX_MARK } from '../src/lib/omega/pinax';

const T = (s: string) => enc200(s).length;
const mk = (f: (i: number) => any, n: number) => Array.from({ length: n }, (_, i) => JSON.stringify(f(i))).join('\n');
type Case = { name: string; text: string };

const cases: Case[] = [
  // ---- headline record payloads ----
  { name: 'event JSONL (const-heavy)', text: mk((i) => ({ ts: 1727704981 + i, level: 'info', service: 'auth', event: 'login', user: `user_${i}`, ok: true, region: 'us-east-1' }), 10) },
  { name: 'IoT telemetry JSONL (varying)', text: mk((i) => ({ device: `sensor_${i % 3}`, temp: 20 + i, humidity: 40 + i, pressure: 1010 + i, ts: 1727704981 + i }), 12) },
  { name: 'API response JSONL', text: mk((i) => ({ id: i + 1, name: `Item ${i}`, price: 9 + i, inStock: i % 2 === 0, category: 'widgets' }), 15) },
  { name: 'compact JSON array', text: JSON.stringify(Array.from({ length: 8 }, (_, i) => ({ id: i, role: 'user', active: true, name: `n${i}` }))) },
  { name: 'JSONL trailing newline', text: mk((i) => ({ a: i, b: 'x', c: i * 2 }), 6) + '\n' },
  { name: 'spaced JSONL', text: Array.from({ length: 8 }, (_, i) => `{"ts": ${1000 + i}, "level": "info", "user": "u${i}", "ok": true}`).join('\n') },
  { name: 'nulls + negatives + floats', text: mk((i) => ({ id: i, val: i % 2 ? null : -i * 1.5, tag: 'row', big: 1e6 + i }), 9) },
  { name: 'large 40-row log', text: mk((i) => ({ ts: 1727700000 + i, lvl: 'INFO', svc: 'api', code: 200, ms: 10 + (i % 7) }), 40) },

  // ---- MUST DECLINE (identity, no corruption) ----
  { name: 'plain english prose', text: 'The quick brown fox jumps over the lazy dog. It was a bright cold day in April.' },
  { name: 'single JSON object', text: '{"a":1,"b":"hello","c":true}' },
  { name: 'markdown text', text: '# Title\n\nSome **bold** text and a [link](http://x).\n\n- item one\n- item two' },
  { name: 'non-uniform keys', text: '{"a":1,"b":2}\n{"a":1,"c":3}\n{"a":1,"b":2}' },
  { name: 'nested objects (declined v1)', text: mk((i) => ({ id: i, meta: { x: i } }), 4) },
  { name: 'arrays as values (declined v1)', text: mk((i) => ({ id: i, tags: [i, i + 1] }), 4) },
  { name: 'ragged column count', text: '{"a":1,"b":2,"c":3}\n{"a":4,"b":5}' },
  { name: 'value contains a tab', text: '{"a":1,"b":"x\\ty"}\n{"a":2,"b":"z\\tw"}' },
  { name: 'CSV not JSON', text: 'id,name,dept\n1,Alice,Eng\n2,Bob,Ops' },
  { name: 'empty', text: '' },
  { name: 'pretty-printed array (declined)', text: JSON.stringify(Array.from({ length: 4 }, (_, i) => ({ id: i, ok: true })), null, 2) },

  // ---- ADVERSARIAL ----
  { name: 'value contains ◇ (data)', text: mk((i) => ({ id: i, shape: '◇diamond', k: 'c' }), 5) },
  { name: 'value contains | and commas', text: mk((i) => ({ id: i, path: `a|b,c/${i}`, k: 'x' }), 5) },
  { name: 'unicode + emoji values', text: mk((i) => ({ id: i, msg: `café ${i} 🚀`, lang: 'fr' }), 6) },
  { name: 'escaped quotes in strings', text: mk((i) => ({ id: i, q: `he said \\"hi ${i}\\"`, k: 'z' }), 5) },
  { name: 'input already starting with ▦', text: PINAX_MARK + 'JSONL n=2\n{"a":◇}\n1\n2' },
  { name: 'all-constant records (declined)', text: mk(() => ({ a: 1, b: 'same', c: true }), 5) },
];

let failures = 0, applied = 0, regressions = 0, sumIn = 0, sumOut = 0, appIn = 0, appOut = 0;
const rows: string[] = [];

for (const c of cases) {
  const r = pinaxEncode(c.text, 'o200k_base');
  // correct semantics: applied ⇒ decode round-trips; declined ⇒ wire is untouched identity.
  const decodeFull = r.applied ? pinaxDecode(r.wire) === c.text : r.wire === c.text;
  if (!decodeFull) { failures++; rows.push(`  ✗ EXACT FAIL: ${c.name}`); }
  if (r.applied && r.messageTokens >= r.inTokens) { regressions++; rows.push(`  ✗ HONESTY FAIL: ${c.name}`); }
  if (!r.applied && r.wire !== c.text) { regressions++; rows.push(`  ✗ REGRESSION (mutated on decline): ${c.name}`); }
  if (r.applied) { applied++; appIn += r.inTokens; appOut += r.messageTokens; }
  sumIn += r.inTokens; sumOut += r.messageTokens;
  const tag = decodeFull ? (r.applied ? '✓apply' : '·ident') : '✗FAIL';
  rows.push(`  ${tag}  ${c.name.padEnd(34)} in=${String(r.inTokens).padStart(4)} msg=${String(r.messageTokens).padStart(4)} save=${String(r.inTokens - r.messageTokens).padStart(4)} (${r.savingsPct.toFixed(0)}%)  ${r.kind}${r.applied ? ` ${r.varCols}/${r.cols}v` : ''}`);
}

// ---- FUZZ ----
let fuzzFail = 0;
function rnd(seed: number) { let s = seed; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; }
const R = rnd(20260930);
const strPool = ['info', 'warn', 'error', 'auth', 'api', 'us-east-1', 'café', '🚀x', 'a b', 'q"z', 'n', 'user', ''];
for (let t = 0; t < 6000; t++) {
  const nRows = 2 + Math.floor(R() * 8);
  const nCols = 1 + Math.floor(R() * 5);
  const colType = Array.from({ length: nCols }, () => Math.floor(R() * 5)); // 0 str,1 num,2 bool,3 null,4 const-str
  const colConst = Array.from({ length: nCols }, () => R() < 0.4);
  const constVal: any[] = colType.map((ty, j) => {
    if (ty === 0 || ty === 4) return strPool[Math.floor(R() * strPool.length)];
    if (ty === 1) return Math.floor(R() * 1000);
    if (ty === 2) return R() < 0.5;
    return null;
  });
  const recs = Array.from({ length: nRows }, (_, ri) => {
    const o: any = {};
    for (let j = 0; j < nCols; j++) {
      const key = `k${j}`;
      if (colConst[j]) { o[key] = constVal[j]; continue; }
      const ty = colType[j];
      if (ty === 0 || ty === 4) o[key] = strPool[Math.floor(R() * strPool.length)];
      else if (ty === 1) o[key] = Math.floor(R() * 100000) - 500;
      else if (ty === 2) o[key] = R() < 0.5;
      else o[key] = null;
    }
    return o;
  });
  const asArray = t % 2 === 0;
  const src = asArray ? JSON.stringify(recs) : recs.map((o) => JSON.stringify(o)).join('\n') + (t % 4 === 0 ? '\n' : '');
  const rr = pinaxEncode(src, 'o200k_base');
  const back = rr.applied ? pinaxDecode(rr.wire) : rr.wire;
  if (back !== src) { fuzzFail++; if (fuzzFail <= 4) rows.push(`  ✗ FUZZ FAIL: ${JSON.stringify(src.slice(0, 60))}`); }
}

console.log('=== PINAX-▦ RED-TEAM ================================================');
console.log(rows.join('\n'));
console.log('--------------------------------------------------------------------');
console.log(`cases=${cases.length} applied=${applied} exact_failures=${failures} honesty/regression=${regressions} fuzz(6000)_failures=${fuzzFail}`);
console.log(`aggregate all cases   : in=${sumIn} msg=${sumOut} saved=${sumIn - sumOut}`);
console.log(`aggregate WHERE APPLIED: in=${appIn} msg=${appOut} saved=${appIn - appOut} (${(100 * (appIn - appOut) / Math.max(1, appIn)).toFixed(1)}%)`);
const ok = failures === 0 && regressions === 0 && fuzzFail === 0;
console.log(ok ? '\n✅ PASS — byte-exact, honest, no regressions, 6000-case fuzz clean.' : '\n❌ FAIL — see above.');
process.exit(ok ? 0 : 1);
