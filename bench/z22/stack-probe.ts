// Stack comparison on the same corpus: identity, PHALANX-P3 (committed), PHALANX-P4 (variant C), PHALANX-P5 (P4 with VX-M).
// Every wire is decoded with its own decoder and compared byte for byte. Plus edge cases and a 3,000-case fuzz.
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '@/lib/omega/bpe';
import { phalanx3Encode, phalanx3Decode } from '@/lib/omega/phalanx3';
import { phalanx4Encode, phalanx4Decode } from '@/lib/omega/phalanx4';
import { phalanx5Encode, phalanx5Decode } from './experiments/phalanx5';
import { phalanx6Encode, phalanx6Decode } from './experiments/phalanx6';

const groups: Record<string, string[]> = {
  prose: ['bench/holdout/gh-prose.txt', 'bench/holdout/readme.txt', 'bench/holdout/license.txt', 'bench/holdout/lic-mit.txt', 'bench/holdout/md-react.txt', 'bench/holdout/md-vite.txt'],
  code: ['bench/holdout/code-ts.txt', 'bench/holdout/code-dts.txt', 'bench/holdout/json-pkg.txt', 'bench/holdout/gh-api.json.txt'],
  ops: fs.readdirSync('bench/holdout-ops').map((f) => path.join('bench/holdout-ops', f)).concat(fs.readdirSync('bench/z20/samples').map((f) => path.join('bench/z20/samples', f))),
};
const agg: Record<string, { id: number; p3: number; p4: number; p5: number; p6: number }> = {};
let bad = 0;
const ms5: number[] = [];
for (const [g, files] of Object.entries(groups)) {
  agg[g] = { id: 0, p3: 0, p4: 0, p5: 0, p6: 0 };
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    const a = phalanx3Encode(t), b = phalanx4Encode(t);
    const t0 = Date.now(); const c = phalanx5Encode(t); ms5.push(Date.now() - t0);
    if (phalanx3Decode(a.wire) !== t) bad++;
    if (phalanx4Decode(b.wire) !== t) bad++;
    if (phalanx5Decode(c.wire) !== t) bad++;
    const d6 = phalanx6Encode(t); if (phalanx6Decode(d6.wire) !== t) bad++;
    const A = agg[g]; A.id += countTokens(t, 'o200k_base'); A.p3 += a.outTokens; A.p4 += b.outTokens; A.p5 += c.outTokens; A.p6 += d6.outTokens;
    console.log(`${g} ${f}: id=${countTokens(t, 'o200k_base')} P3=${a.outTokens} P4=${b.outTokens} P5=${c.outTokens} (P5-P3=${c.outTokens - a.outTokens}) mode5=${c.mode}`);
  }
}
for (const [g, A] of Object.entries(agg)) console.log(`TOTAL ${g}: identity=${A.id} P3=${A.p3} P4=${A.p4} P5=${A.p5} P6=${A.p6} | P6 vs P4 ${A.p6 - A.p4} (${(((A.p6 - A.p4) / A.p4) * 100).toFixed(2)}%) | P6 vs P3 ${A.p6 - A.p3}`);
const sum = (k: 'p3' | 'p4' | 'p5' | 'p6') => Object.values(agg).reduce((s, A) => s + A[k], 0);
console.log(`ALL: P3=${sum('p3')} P4=${sum('p4')} P5=${sum('p5')} P6=${sum('p6')} (P6-P4=${sum('p6') - sum('p4')}, ${(((sum('p6') - sum('p4')) / sum('p4')) * 100).toFixed(2)}%)`);
console.log(`P5 encode ms: median=${ms5.sort((x, y) => x - y)[Math.floor(ms5.length / 2)]} max=${Math.max(...ms5)} over ${ms5.length} files`);
// red team
const edges: string[] = ['', '\n', 'a', 'PHALANX-P5 legend: x\nbody', 'PHALANX-P5: identity\nkeep', 'PHALANX-P4 legend: [rc] x\nq',
  '[[VX1\n~a=zz\n]]\nbody ~a', '[[VX1\nnot a dict\n', 'a b\na b\na b\na b\na b\n', 'x'.repeat(5000), 'ab cd ef '.repeat(400),
  'the cat the cat the cat the cat\n', '~~~~ ~0 ~1 ~N', 'é 中文 🚀 '.repeat(50), '\r\n'.repeat(300)];
for (const e of edges) { const r = phalanx5Encode(e); if (phalanx5Decode(r.wire) !== e) bad++; }
let seed = 4242; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const words = ['a', 'bb', '^', '=', '@1', '&3:', '~a', '~~', '[[VX1', ']]', 'PHALANX-P5', '/usr/lib/x', '/usr/lib/y', 'A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6', 'the', 'and', 'cat', 'dog', '\t', '  '];
let fz = 0;
for (let n = 0; n < 3000; n++) {
  const lines: string[] = [];
  const L = 1 + Math.floor(rnd() * 16);
  for (let i = 0; i < L; i++) {
    if (lines.length && rnd() < 0.5) { lines.push(lines[Math.floor(rnd() * lines.length)]); continue; }
    const k = 1 + Math.floor(rnd() * 9); const parts: string[] = [];
    for (let j = 0; j < k; j++) parts.push(words[Math.floor(rnd() * words.length)]);
    lines.push(parts.join(rnd() < 0.8 ? ' ' : '\t'));
  }
  const text = lines.join('\n') + (rnd() < 0.2 ? '\n' : '');
  const r = phalanx5Encode(text);
  if (phalanx5Decode(r.wire) === text && r.decoded === text) fz++; else bad++;
  const r6 = phalanx6Encode(text); if (phalanx6Decode(r6.wire) !== text) bad++;
}
console.log(`edge cases ${edges.length}; fuzz exact ${fz}/3000; decode failures total ${bad}`);
console.log(bad === 0 ? 'ALL EXACT' : 'FAILURES');
