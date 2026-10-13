// Pipeline comparison on the 21-file corpus: PHALANX-P4 (VX1 with legend) vs PHALANX-A1 (VXA).
// Every wire decoded with its own decoder and compared byte for byte. Plus edge cases and a fuzz run.
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '@/lib/omega/bpe';
import { phalanx4Encode, phalanx4Decode } from '@/lib/omega/phalanx4';
import { phalanxA1Encode, phalanxA1Decode } from '@/lib/omega/phalanx-a1';
import { phalanxA2Encode, phalanxA2Decode } from '@/lib/omega/phalanx-a2';

const groups: Record<string, string[]> = {
  prose: ['bench/holdout/gh-prose.txt', 'bench/holdout/readme.txt', 'bench/holdout/license.txt', 'bench/holdout/lic-mit.txt', 'bench/holdout/md-react.txt', 'bench/holdout/md-vite.txt'],
  code: ['bench/holdout/code-ts.txt', 'bench/holdout/code-dts.txt', 'bench/holdout/json-pkg.txt', 'bench/holdout/gh-api.json.txt'],
  ops: fs.readdirSync('bench/holdout-ops').map((f) => path.join('bench/holdout-ops', f)).concat(fs.readdirSync('bench/z20/samples').map((f) => path.join('bench/z20/samples', f))),
};
const agg: Record<string, { id: number; p4: number; a1: number; a2: number; n: number; a2Wins: number; a1Wins: number }> = {};
let bad = 0;
const ms: number[] = [];
for (const [g, files] of Object.entries(groups)) {
  agg[g] = { id: 0, p4: 0, a1: 0, a2: 0, n: 0, a2Wins: 0, a1Wins: 0 };
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    const p = phalanx4Encode(t);
    const a1 = phalanxA1Encode(t);
    const t0 = Date.now(); const a = phalanxA2Encode(t); ms.push(Date.now() - t0);
    if (phalanxA1Decode(a1.wire) !== t) bad++;
    if (phalanx4Decode(p.wire) !== t) bad++;
    if (phalanxA2Decode(a.wire) !== t || a.decoded !== t) bad++;
    const A = agg[g];
    A.n++; A.id += countTokens(t, 'o200k_base'); A.p4 += p.outTokens; A.a1 += a1.outTokens; A.a2 += a.outTokens;
    if (a.outTokens < a1.outTokens) A.a2Wins++; else if (a1.outTokens < a.outTokens) A.a1Wins++;
    console.log(`${g} ${path.basename(f)}: id=${countTokens(t, 'o200k_base')} P4=${p.outTokens} A1=${a1.outTokens} A2=${a.outTokens} (A2-A1=${a.outTokens - a1.outTokens}) mode=${a.mode} vxKept=${a.vxKept}`);
  }
}
for (const [g, A] of Object.entries(agg)) console.log(`TOTAL ${g}: n=${A.n} identity=${A.id} P4=${A.p4} A1=${A.a1} A2=${A.a2} (A2-A1=${A.a2 - A.a1}, ${(((A.a2 - A.a1) / A.a1) * 100).toFixed(2)}%; A2-P4=${A.a2 - A.p4}) A2 wins ${A.a2Wins}, A1 wins ${A.a1Wins}`);
const sum = (k: 'id' | 'p4' | 'a1' | 'a2') => Object.values(agg).reduce((s, A) => s + A[k], 0);
console.log(`ALL: identity=${sum('id')} P4=${sum('p4')} A1=${sum('a1')} A2=${sum('a2')} (A2-A1=${sum('a2') - sum('a1')}; A2-P4=${sum('a2') - sum('p4')}, ${(((sum('a2') - sum('p4')) / sum('p4')) * 100).toFixed(2)}%)`);
console.log(`A2 encode ms: median=${ms.sort((x, y) => x - y)[Math.floor(ms.length / 2)]} max=${Math.max(...ms)}`);
// edge cases
const edges: string[] = ['', '\n', 'a', '~', '~~', '~a', '[[VXA\n', '[[VXA\nx\n]]\nbody', '[[VX1\n~a=zz\n]]\nbody ~a', 'PHALANX-A1 legend: x\nbody', 'PHALANX-A1: identity\nkeep',
  'a b\na b\na b\na b\na b\n', 'x'.repeat(5000), 'ab cd ef '.repeat(400), '~~~~ ~0 ~1 ~N ~a ~b', 'é 中文 🚀 '.repeat(50), '\r\n'.repeat(300),
  '[[VXA\n' + '¦=~a\n]]\n¦ ¦ ¦ ¦ ~a ~a ~a'];
for (const e of edges) { const r = phalanxA2Encode(e); if (phalanxA2Decode(r.wire) !== e) bad++; }
// fuzz (same generator family as stack-probe, extended with alias-like characters)
let seed = 9001; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const words = ['a', 'bb', '^', '=', '@1', '&3:', '~a', '~~', '~N', '[[VXA', ']]', '¦', '¡', '§', '/usr/lib/x', 'the', 'and', 'cat', 'dog', '\t', '  ', 'A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6', 'PHALANX-A1'];
let fz = 0;
for (let n = 0; n < 1500; n++) {
  const lines: string[] = [];
  const L = 1 + Math.floor(rnd() * 16);
  for (let i = 0; i < L; i++) {
    if (lines.length && rnd() < 0.5) { lines.push(lines[Math.floor(rnd() * lines.length)]); continue; }
    const k = 1 + Math.floor(rnd() * 9); const parts: string[] = [];
    for (let j = 0; j < k; j++) parts.push(words[Math.floor(rnd() * words.length)]);
    lines.push(parts.join(rnd() < 0.8 ? ' ' : '\t'));
  }
  const text = lines.join('\n') + (rnd() < 0.2 ? '\n' : '');
  const r = phalanxA2Encode(text);
  if (phalanxA2Decode(r.wire) === text && r.decoded === text) fz++; else bad++;
}
console.log(`edge cases ${edges.length}; fuzz exact ${fz}/1500; decode failures total ${bad}`);
console.log(bad === 0 ? 'ALL EXACT' : 'FAILURES');
