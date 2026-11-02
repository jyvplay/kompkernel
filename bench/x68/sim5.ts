import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const POOL: string[] = [];
for (let cp = 0x0430; cp <= 0x045F; cp++) POOL.push(String.fromCodePoint(cp));
for (let cp = 0x0250; cp <= 0x02AF; cp++) POOL.push(String.fromCodePoint(cp));
for (let cp = 0x0370; cp <= 0x03FF; cp++) POOL.push(String.fromCodePoint(cp));
for (let cp = 0x0400; cp <= 0x042F; cp++) POOL.push(String.fromCodePoint(cp));
const ONE = POOL.filter(c => countTokens(c, enc) === 1);
type Mode = 'count' | 'profit';
export function sim(t: string, mode: Mode = 'profit') {
  const toks = tokenStrings(t, enc).map(x => x.s);
  const lit: string[] = [];
  const idOf = new Map<string, number>();
  let seq = toks.map(s => { let v = idOf.get(s); if (v === undefined) { v = lit.length; idOf.set(s, v); lit.push(s); } return v; });
  const nLit = lit.length;
  const rules: Array<{ a: number; b: number; g: string }> = [];
  const len = (id: number) => (id < nLit ? 1 : 1); // symbol lengths are 1 token each in symbol space
  const M = 1 << 22;
  for (let iter = 0; iter < 4000; iter++) {
    const cnt = new Map<number, number>();
    for (let i = 0; i + 1 < seq.length; i++) { const k = seq[i] * M + seq[i + 1]; cnt.set(k, (cnt.get(k) ?? 0) + 1); }
    let bestK = -1, bestScore = -Infinity;
    for (const [k, c] of cnt) {
      let score: number;
      if (mode === 'count') score = c;
      else {
        const a = Math.floor(k / M), b = k % M;
        const kTokens = countTokens(surfOf(a) + surfOf(b), enc);  // real token length of the span
        score = c * (kTokens - 1) - kTokens;                      // exact profit
      }
      if (score > bestScore) { bestScore = score; bestK = k; }
    }
    function surfOf(id: number): string { return id < nLit ? lit[id] : rules[id - nLit].g; }
    if (bestK < 0 || rules.length >= ONE.length) break;
    if (bestScore < 1) break;
    const a = Math.floor(bestK / M), b = bestK % M;
    const g = ONE[rules.length];
    const nid = nLit + rules.length;
    rules.push({ a, b, g });
    const out: number[] = [];
    for (let i = 0; i < seq.length; i++) { if (i + 1 < seq.length && seq[i] === a && seq[i + 1] === b) { out.push(nid); i++; } else out.push(seq[i]); }
    seq = out;
  }
  const surf = (id: number): string => (id < nLit ? lit[id] : rules[id - nLit].g);
  const seen = new Set<number>();
  let wire = '';
  for (const id of seq) {
    if (id < nLit) { wire += lit[id]; continue; }
    const r = rules[id - nLit];
    if (!seen.has(id)) { seen.add(id); wire += surf(r.a) + surf(r.b) + r.g; } else wire += r.g;
  }
  return { wireTokens: countTokens(wire, enc), rules: rules.length, syms: seq.length };
}
const frontier: Record<string, number> = {
  'kb-article.txt': 622, 'lic-mit.txt': 223, 'md-react.txt': 252, 'md-vite.txt': 255, 'component.jsx': 264,
  'paper.tex': 370, 'llm-answer.md': 674, 'gh-prose.txt': 1752, 'code-ts.txt': 985, 'readme.txt': 646,
  'license.txt': 929, 'bibliography.txt': 672, 'email-thread.txt': 488, 'meeting-transcript.txt': 385,
  'unified-diff.patch': 419, 'json-pkg.txt': 681, 'pom.xml': 242, 'dump.sql': 672,
  'psql-output.txt': 355, 'code-dts.txt': 77, 'kubectl-get-pods.txt': 326, 'page.html': 547, 'gh-api.json.txt': 1112,
};
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const raw = countTokens(t, enc);
  const p = sim(t, 'profit'), c = sim(t, 'count');
  const key = f.split('/').pop()!;
  const fr = frontier[key];
  console.log(JSON.stringify({ f: key, raw, profit: p.wireTokens + 9, profitRules: p.rules, count: c.wireTokens + 9, frontier: fr ?? null, dProfit: fr ? p.wireTokens + 9 - fr : null, dCount: fr ? c.wireTokens + 9 - fr : null }));
}
