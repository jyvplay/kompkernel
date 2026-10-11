// KLIMAX probe: how much do integer arithmetic runs cost, over holdout + CSV corpus? (text-level, before contract)
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '../../src/lib/omega/bpe';

const RE = /(?<![\w.+\-])(0|[1-9]\d*)(?![\w.])/g;
interface M { s: number; e: number; v: number }
function matches(T: string): M[] {
  const out: M[] = [];
  for (const m of T.matchAll(RE)) out.push({ s: m.index!, e: m.index! + m[0].length, v: Number(m[0]) });
  return out;
}
function runs(T: string, minN: number, maxSep: number) {
  const ms = matches(T);
  const found: Array<{ s: number; e: number; A: number; D: number; N: number; S: string }> = [];
  let i = 0;
  while (i < ms.length) {
    let j = i; let D = 0; let S = '';
    if (i + 1 < ms.length) {
      S = T.slice(ms[i].e, ms[i + 1].s);
      if (S.length <= maxSep && !/\d/.test(S)) {
        D = ms[i + 1].v - ms[i].v;
        j = i + 1;
        while (j + 1 < ms.length && T.slice(ms[j].e, ms[j + 1].s) === S && ms[j + 1].v - ms[j].v === D) j++;
      }
    }
    const N = j - i + 1;
    if (N >= minN) { found.push({ s: ms[i].s, e: ms[j].e, A: ms[i].v, D, N, S }); i = j + 1; } else i++;
  }
  return found;
}
const dirs = ['bench/holdout', 'bench/holdout-lang', 'bench/holdout-mk', 'bench/holdout-ops', 'bench/holdout-tbl', 'bench/holdout-tab', 'bench/holdout-work', 'bench/tmp/csvcorpus'];
const files: string[] = [];
for (const d of dirs) if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isFile() && fs.statSync(p).size < 400000) files.push(p); }
let totIn = 0, totOut = 0, nf = 0, fw = 0; const rows: string[] = [];
const minN = Number(process.env.MINN ?? 4);
for (const f of files) {
  const T = fs.readFileSync(f, 'utf8');
  if (/[⟪⟫]/.test(T)) continue;
  const rs = runs(T, minN, 4);
  if (!rs.length) continue;
  // build transformed text (sentinel-free probe: replacement "⟪A:D:N⟫")
  let out = ''; let last = 0;
  for (const r of rs) { out += T.slice(last, r.s) + `⟪${r.A}:${r.D}:${r.N}⟫`; last = r.e; }
  out += T.slice(last);
  const a = countTokens(T, 'o200k_base'), b = countTokens(out, 'o200k_base');
  totIn += a; totOut += b; nf++; if (b < a) fw++;
  rows.push(`${b - a}\t${a}\t${rs.length}\t${f}`);
}
rows.sort((x, y) => Number(x.split('\t')[0]) - Number(y.split('\t')[0]));
console.log(rows.slice(0, 25).join('\n'));
console.log(JSON.stringify({ minN, filesWithRuns: nf, filesSmaller: fw, totIn, totOut, delta: totOut - totIn, pct: +(100 * (totOut - totIn) / totIn).toFixed(3) }));
