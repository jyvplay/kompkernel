// VERITAS window sweep: W=3 must equal veritas.ts byte for byte; W=2 is the candidate.
// Every wire is decoded with the unchanged veritasDecode and compared. o200k_base.
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '@/lib/omega/bpe';
import { veritasEncode, veritasDecode } from '@/lib/omega/veritas';
import { veritasEncodeW, veritasEncodeMulti, veritasDecodeL } from '@/lib/omega/veritas-w';

const groups: Record<string, string[]> = {
  prose: ['bench/holdout/gh-prose.txt', 'bench/holdout/readme.txt', 'bench/holdout/license.txt', 'bench/holdout/lic-mit.txt', 'bench/holdout/md-react.txt', 'bench/holdout/md-vite.txt'],
  code: ['bench/holdout/code-ts.txt', 'bench/holdout/code-dts.txt', 'bench/holdout/json-pkg.txt', 'bench/holdout/gh-api.json.txt'],
  ops: fs.readdirSync('bench/holdout-ops').map((f) => path.join('bench/holdout-ops', f)).concat(fs.readdirSync('bench/z20/samples').map((f) => path.join('bench/z20/samples', f))),
};
// repo's own markdown as extra prose (not a tuned set: first 12 files by name)
const mdFiles = fs.readdirSync('bench/z20').filter((f) => f.endsWith('.md')).slice(0, 12).map((f) => path.join('bench/z20', f));
groups.prose_repo = mdFiles;

const G3: Record<string, number> = {}, G2e: Record<string, number> = {}, MU: Record<string, number> = {}, MS: Record<string, number> = {};
const tot: Record<string, { id: number; w3: number; w2: number; w2wins: number; w2loss: number; n: number }> = {};
let bad = 0, w3diff = 0;
for (const [g, files] of Object.entries(groups)) {
  tot[g] = { id: 0, w3: 0, w2: 0, w2wins: 0, w2loss: 0, n: 0 };
  for (const f of files) {
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) continue;
    const t = fs.readFileSync(f, 'utf8');
    const a = veritasEncode(t, 'o200k_base');
    const b3 = veritasEncodeW(t, 'o200k_base', 3);
    const b2 = veritasEncodeW(t, 'o200k_base', 2, true);
    const b3g = veritasEncodeW(t, 'o200k_base', 3, true);
    const b2e = veritasEncodeW(t, 'o200k_base', 2, false);
    if (veritasDecode(b3g.wire) !== t || veritasDecode(b2e.wire) !== t) bad++;
    G3[g] = (G3[g] ?? 0) + b3g.outTokens; G2e[g] = (G2e[g] ?? 0) + b2e.outTokens;
    if (b3.wire !== a.wire) w3diff++;
    if (veritasDecode(b2.wire) !== t) bad++;
    if (veritasDecode(b3.wire) !== t) bad++;
    const tm0 = Date.now(); const mu = veritasEncodeMulti(t, 'o200k_base', [3, 2]); const tmMs = Date.now() - tm0;
    if (veritasDecodeL(mu.wire) !== t) bad++;
    MU[g] = (MU[g] ?? 0) + mu.outTokens; MS[g] = (MS[g] ?? 0) + tmMs;
    const id = countTokens(t, 'o200k_base');
    const T = tot[g]; T.n++; T.id += id; T.w3 += a.outTokens; T.w2 += b2.outTokens;
    if (b2.outTokens < a.outTokens) T.w2wins++; else if (b2.outTokens > a.outTokens) T.w2loss++;
    console.log(`${g} ${f}: id=${id} VX1=${a.outTokens} VX2gate=${b2.outTokens} (${b2.outTokens - a.outTokens >= 0 ? '+' : ''}${b2.outTokens - a.outTokens}) W3gate=${b3g.outTokens} entries2=${b2.entries.length} mode=${b2.mode}`);
  }
}
for (const [g, T] of Object.entries(tot)) console.log(`TOTAL ${g}: VXM(3+2 real)=${MU[g]} ms=${MS[g]} VX1+realGate(W3)=${G3[g]} VX2-estimated=${G2e[g]}`, `TOTAL ${g}: n=${T.n} identity=${T.id} VX1=${T.w3} VX2=${T.w2} (${T.w2 - T.w3}, ${(((T.w2 - T.w3) / Math.max(T.w3, 1)) * 100).toFixed(2)}%) VX2 better on ${T.w2wins}, worse on ${T.w2loss}`);
console.log(`W=3 byte-identity mismatches vs veritas.ts: ${w3diff}; decode failures: ${bad}`);
