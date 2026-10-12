// VX stage only (raw text): VERITAS-A best-of-W (committed A2 choice) vs VERITAS-CH (character-aligned mining).
// Every wire decoded with the VERITAS-A decoder and compared byte for byte.
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '@/lib/omega/bpe';
import { veritasABest, veritasADecode } from '@/lib/omega/veritas-a';
import { veritasCharEncode } from './experiments/veritas-ch';

const groups: Record<string, string[]> = {
  prose: ['bench/holdout/gh-prose.txt', 'bench/holdout/readme.txt', 'bench/holdout/license.txt', 'bench/holdout/lic-mit.txt', 'bench/holdout/md-react.txt', 'bench/holdout/md-vite.txt'],
  code: ['bench/holdout/code-ts.txt', 'bench/holdout/code-dts.txt', 'bench/holdout/json-pkg.txt', 'bench/holdout/gh-api.json.txt'],
  ops: fs.readdirSync('bench/holdout-ops').map((f) => path.join('bench/holdout-ops', f)).concat(fs.readdirSync('bench/z20/samples').map((f) => path.join('bench/z20/samples', f))),
  realjson: fs.readdirSync('bench/z25/json-real').map((f) => path.join('bench/z25/json-real', f)),
};
const enc = 'o200k_base' as const;
const enc2 = { id: 0, a: 0, ch: 0, chWins: 0, aWins: 0 };
const agg: Record<string, { id: number; a: number; ch: number; chWins: number; aWins: number; ms: number }> = {};
let bad = 0;
for (const [g, files] of Object.entries(groups)) {
  agg[g] = { id: 0, a: 0, ch: 0, chWins: 0, aWins: 0, ms: 0 };
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    const id = countTokens(t, enc);
    const a = Math.min(veritasABest(t, enc).outTokens, id);
    const t0 = Date.now();
    const c = veritasCharEncode(t, enc);
    agg[g].ms += Date.now() - t0;
    if (veritasADecode(c.wire) !== t) bad++;
    const ch = Math.min(c.outTokens, id);
    const A = agg[g]; A.id += id; A.a += a; A.ch += ch;
    if (ch < a) A.chWins++; else if (a < ch) A.aWins++;
    console.log(`${g} ${path.basename(f)}: id=${id} VXA=${a} CH=${ch} (${ch - a}) entries=${c.entries.length}`);
  }
}
for (const [g, A] of Object.entries(agg)) console.log(`TOTAL ${g}: identity=${A.id} VXA-best=${A.a} CH=${A.ch} (CH-VXA=${A.ch - A.a}, ${(((A.ch - A.a) / A.a) * 100).toFixed(2)}%) CH wins ${A.chWins}, VXA wins ${A.aWins}, CH encode ms ${A.ms}`);
const sum = (k: 'id' | 'a' | 'ch') => Object.values(agg).reduce((s, A) => s + A[k], 0);
console.log(`ALL: identity=${sum('id')} VXA-best=${sum('a')} CH=${sum('ch')} (CH-VXA=${sum('ch') - sum('a')})`);
console.log(`decode failures: ${bad}`);
