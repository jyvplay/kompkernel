import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const POOL: string[] = [];
for (let cp = 0x0430; cp <= 0x045F; cp++) POOL.push(String.fromCodePoint(cp));
for (let cp = 0x0250; cp <= 0x02AF; cp++) POOL.push(String.fromCodePoint(cp));
for (let cp = 0x0370; cp <= 0x03FF; cp++) POOL.push(String.fromCodePoint(cp));
for (let cp = 0x0400; cp <= 0x042F; cp++) POOL.push(String.fromCodePoint(cp));
const ONE = POOL.filter(c => countTokens(c, enc) === 1);
interface R { a: number; b: number; g: string; }
export function sim(t: string, minProfit = 1) {
  const toks = tokenStrings(t, enc).map(x => x.s);
  const lit: string[] = toks.slice();
  const idOf = new Map<number, number>();  // literal index -> symbol id (identity)
  let seq = toks.map((_, i) => i);
  const rules: R[] = [];
  const M = 1 << 22;
  for (let iter = 0; iter < 4000; iter++) {
    const cnt = new Map<number, number>();
    for (let i = 0; i + 1 < seq.length; i++) { const k = seq[i] * M + seq[i + 1]; cnt.set(k, (cnt.get(k) ?? 0) + 1); }
    let bestK = -1, bestC = 0;
    for (const [k, c] of cnt) if (c > bestC) { bestC = c; bestK = k; }
    if (bestK < 0 || rules.length >= ONE.length) break;
    // profit: replacing c-1 occurrences saves (c-1)*(tokens of pair - 1); definition costs 1 glyph.
    if (bestC - 2 < minProfit) break;
    const a = Math.floor(bestK / M), b = bestK % M;
    const g = ONE[rules.length];
    const nid = toks.length + rules.length;
    rules.push({ a, b, g });
    const out: number[] = [];
    for (let i = 0; i < seq.length; i++) { if (i + 1 < seq.length && seq[i] === a && seq[i + 1] === b) { out.push(nid); i++; } else out.push(seq[i]); }
    seq = out;
  }
  // wire with in-place definition at first use: text + glyph; later: glyph
  const seen = new Set<number>();
  const surf = (id: number): string => (id < toks.length ? lit[id] : rules[id - toks.length].g);
  let wire = '';
  for (const id of seq) {
    if (id < toks.length) { wire += lit[id]; continue; }
    if (!seen.has(id)) { seen.add(id); const r = rules[id - toks.length]; wire += surf(r.a) + surf(r.b) + r.g; }
    else wire += rules[id - toks.length].g;
  }
  // verify: decode the wire
  return { wireTokens: countTokens(wire, enc), rules: rules.length, syms: seq.length };
}
const frontier: Record<string, number> = {
  'kb-article.txt': 622, 'lic-mit.txt': 223, 'md-react.txt': 252, 'md-vite.txt': 255, 'component.jsx': 264,
  'paper.tex': 370, 'llm-answer.md': 674, 'gh-prose.txt': 1752, 'code-ts.txt': 985, 'readme.txt': 646,
  'license.txt': 929, 'bibliography.txt': 672, 'email-thread.txt': 488, 'meeting-transcript.txt': 385,
  'unified-diff.patch': 419, 'json-pkg.txt': 681, 'gh-api.json.txt': 1112, 'pom.xml': 242, 'dump.sql': 672,
  'page.html': 547, 'code-dts.txt': 77, 'kubectl-get-pods.txt': 326, 'psql-output.txt': 355,
};
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const raw = countTokens(t, enc);
  const r = sim(t);
  const key = f.split('/').pop()!;
  const fr = frontier[key];
  console.log(JSON.stringify({ f: key, raw, wire: r.wireTokens, rules: r.rules, msgEq: r.wireTokens + 9, frontier: fr ?? null, delta: fr ? (r.wireTokens + 9) - fr : null }));
}
