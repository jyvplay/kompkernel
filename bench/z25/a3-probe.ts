// PHALANX-A3 (canonical-JSON layer) vs PHALANX-A2 on the 21-file corpus plus the three real npm manifests.
// Every wire is decoded and compared byte for byte. Plus JSON edge cases and a fuzz set of JSON documents.
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxA2Encode, phalanxA2Decode } from '@/lib/omega/phalanx-a2';
import { phalanxA3Encode, phalanxA3Decode } from '@/lib/omega/phalanx-a3';

const files = [
  'bench/holdout/gh-prose.txt', 'bench/holdout/readme.txt', 'bench/holdout/license.txt', 'bench/holdout/lic-mit.txt', 'bench/holdout/md-react.txt', 'bench/holdout/md-vite.txt',
  'bench/holdout/code-ts.txt', 'bench/holdout/code-dts.txt', 'bench/holdout/json-pkg.txt', 'bench/holdout/gh-api.json.txt',
  ...fs.readdirSync('bench/holdout-ops').map((f) => path.join('bench/holdout-ops', f)),
  ...fs.readdirSync('bench/z20/samples').map((f) => path.join('bench/z20/samples', f)),
  ...fs.readdirSync('bench/z25/json-real').map((f) => path.join('bench/z25/json-real', f)),
];
const enc = 'o200k_base' as const;
let bad = 0, layerCount = 0, a2Tot = 0, a3Tot = 0, idTot = 0, layerA2 = 0, layerA3 = 0;
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const a2 = phalanxA2Encode(t, enc);
  const a3 = phalanxA3Encode(t, enc);
  if (phalanxA2Decode(a2.wire) !== t) bad++;
  if (phalanxA3Decode(a3.wire) !== t || a3.decoded !== t) bad++;
  if (a3.layer) { layerCount++; layerA2 += a2.outTokens; layerA3 += a3.outTokens; }
  a2Tot += a2.outTokens; a3Tot += a3.outTokens; idTot += countTokens(t, enc);
  console.log(`${f}: id=${countTokens(t, enc)} A2=${a2.outTokens} A3=${a3.outTokens} (${a3.outTokens - a2.outTokens}) layer=${a3.layer}`);
}
console.log(`CORPUS+REAL (${files.length} files): identity=${idTot} A2=${a2Tot} A3=${a3Tot} (A3-A2=${a3Tot - a2Tot}, ${(((a3Tot - a2Tot) / a2Tot) * 100).toFixed(2)}%)`);
console.log(`files where the canonical layer applies: ${layerCount}; on those, A2=${layerA2} A3=${layerA3} (${(((layerA3 - layerA2) / layerA2) * 100).toFixed(2)}%)`);
// edge cases
const edges = ['', '{}', '[]', '1', '"s"', 'null', '{"a":1}', '{"a":1}\n', '{\n  "a": 1\n}', '{\n\t"a": [\n\t\t1,\n\t\t2\n\t]\n}\n',
  '{\n    "a": 1.0\n}', '{"a":"é 中文 🚀"}', '{\n  "a": "\\u00e9"\n}\n', 'PHALANX-A3 json indent=2 newline=0: x\n{}', '{"a":1,"a":2}', '[1e21]', '{\n  "x": [],\n  "y": {}\n}\n'];
for (const e of edges) { const r = phalanxA3Encode(e, enc); if (phalanxA3Decode(r.wire) !== e) bad++; }
// fuzz: random canonical and near-canonical JSON documents built from real JSON values
let seed = 31337; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const gen = (d: number): unknown => {
  const r = rnd();
  if (d > 3 || r < 0.35) return [1, 'x', true, null, 'héllo ~tilde', 42, -3.5, ''][Math.floor(rnd() * 8)];
  if (r < 0.65) { const n = Math.floor(rnd() * 5); const a: unknown[] = []; for (let i = 0; i < n; i++) a.push(gen(d + 1)); return a; }
  const n = Math.floor(rnd() * 5); const o: Record<string, unknown> = {}; for (let i = 0; i < n; i++) o['k' + Math.floor(rnd() * 9)] = gen(d + 1); return o;
};
let fz = 0, fzLayer = 0;
const IND: [number | string, string][] = [[2, ''], [4, ''], ['\t', '']];
for (let n = 0; n < 1000; n++) {
  const v = gen(0);
  const [ind] = IND[Math.floor(rnd() * 3)];
  const nl = rnd() < 0.5 ? '\n' : '';
  const text = (rnd() < 0.85 ? JSON.stringify(v, null, ind) : JSON.stringify(v)) + nl;
  const r = phalanxA3Encode(text, enc);
  if (phalanxA3Decode(r.wire) === text && r.decoded === text) fz++; else bad++;
  if (r.layer) fzLayer++;
}
console.log(`edge cases ${edges.length}; fuzz exact ${fz}/1000 (canonical layer used on ${fzLayer}); decode failures total ${bad}`);
console.log(bad === 0 ? 'ALL EXACT' : 'FAILURES');
