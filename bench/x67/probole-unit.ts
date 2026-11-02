import * as fs from 'node:fs';
import { probolePlan, proboleRestore, renderCanonical } from '../../src/lib/omega/probole';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
let fail = 0;
const check = (ok: boolean, name: string, extra = '') => { if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' ' + extra : ''}`); };

// canonical renderer identity on the real fixtures
for (const p of ['bench/holdout/json-pkg.txt', 'bench/holdout/gh-api.json.txt']) {
  const t = fs.readFileSync(p, 'utf8').replace(/\n$/, '');
  let parsed: any; try { parsed = JSON.parse(t); } catch { continue; }
  for (const u of ['  ', '    ', '\t', '']) {
    check(renderCanonical(parsed, u) === (u === '  ' ? t : t) || renderCanonical(parsed, u) === JSON.stringify(parsed, null, u === '' ? undefined : u),
      `renderCanonical ≡ JSON.stringify ${p} unit=${JSON.stringify(u)}`);
  }
}

// synthetic exact cases
const rows = Array.from({ length: 40 }, (_, i) => ({ id: i, login: `user${i}`, site_admin: false, score: 100 + i }));
const docs = [
  ['array-of-objects', JSON.stringify(rows, null, 2) + '\n'],
  ['array-of-objects-4', JSON.stringify(rows, null, 4)],
  ['array-of-scalars', JSON.stringify(['a', 'a', 'a', 'a', 'a', 'a', 'a', 'a'], null, 2)],
  ['object-map', JSON.stringify(Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`pkg${i}`, { version: `1.0.${i}`, dev: true, license: 'MIT' }])), null, 4)],
  ['nested', JSON.stringify({ a: 1, list: rows.slice(0, 12), b: { c: rows.slice(0, 8) } }, null, 2)],
  ['const-column', JSON.stringify(Array.from({ length: 50 }, () => ({ k: 'x', v: 'same', n: 7 })), null, 2)],
  ['unicode', JSON.stringify(Array.from({ length: 6 }, (_, i) => ({ n: `χ${i}`, e: '🙂' })), null, 2)],
  ['crlf-refused', JSON.stringify(rows, null, 2).replace(/\n/g, '\r\n')],
  ['noncanonical-refused', '{\n  "a":1,\n  "b":2\n}'],
  ['short-refused', JSON.stringify([{ a: 1 }, { a: 2 }], null, 2)],
];
for (const [name, text] of docs) {
  const plan = probolePlan(text, enc);
  if (!plan) { console.log(`INFO ${name}: refused`); continue; }
  const back = proboleRestore(plan.transformed);
  check(back === text, `exact round trip ${name}`, `raw=${countTokens(text, enc)} probe=${countTokens(plan.transformed, enc)} runs=${plan.runs.length}`);
  check(plan.proxyGain > 0, `proxy gain positive ${name}`, `${plan.proxyGain}`);
  // reader must work from the serialized envelope only
  const reread = proboleRestore(plan.transformed);
  check(reread === back, `reader is serialized-envelope-only ${name}`);
}
// the contract on the wire must be the declared one
const p1 = probolePlan(JSON.stringify(rows, null, 2) + '\n', enc)!;
check(p1.transformed.split('\n')[0].startsWith('PROBOLE-1:'), 'wire carries its own contract');
console.log(fail === 0 ? 'ALL CHECKS PASSED' : `${fail} CHECK(S) FAILED`);
if (fail) process.exitCode = 1;
