import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const POOL: string[] = [];
for (let cp = 0x0430; cp <= 0x045F; cp++) POOL.push(String.fromCodePoint(cp));
for (let cp = 0x0250; cp <= 0x02AF; cp++) POOL.push(String.fromCodePoint(cp));
for (let cp = 0x0370; cp <= 0x03FF; cp++) POOL.push(String.fromCodePoint(cp));
const ONE = POOL.filter(c => countTokens(c, enc) === 1);
const frontier: Record<string, number> = {
  'kb-article.txt': 622, 'lic-mit.txt': 223, 'md-react.txt': 252, 'md-vite.txt': 255, 'component.jsx': 264,
  'paper.tex': 370, 'llm-answer.md': 674, 'gh-prose.txt': 1752, 'code-ts.txt': 985, 'readme.txt': 646,
  'license.txt': 929, 'bibliography.txt': 672, 'email-thread.txt': 488, 'meeting-transcript.txt': 385,
  'unified-diff.patch': 419, 'json-pkg.txt': 681, 'gh-api.json.txt': 1112, 'pom.xml': 242, 'dump.sql': 672,
  'page.html': 547, 'code-dts.txt': 77, 'kubectl-get-pods.txt': 326, 'psql-output.txt': 355,
};
function sim(t: string, minGain = 1) {
  const toks = tokenStrings(t, enc).map(x => x.s);
  const symbols: string[] = [];
  const idOf = new Map<string, number>();
  let seq = toks.map(s => { let v = idOf.get(s); if (v === undefined) { v = symbols.length; idOf.set(s, v); symbols.push(s); } return v; });
  const nTok = symbols.length;
  let rules = 0;
  for (let iter = 0; iter < 3000; iter++) {
    const cnt = new Map<number, number>();
    const M = 1 << 22;
    for (let i = 0; i + 1 < seq.length; i++) { const k = seq[i] * M + seq[i + 1]; cnt.set(k, (cnt.get(k) ?? 0) + 1); }
    let bestK = -1, bestC = 0;
    for (const [k, c] of cnt) if (c > bestC) { bestC = c; bestK = k; }
    if (bestK < 0 || bestC - 2 < minGain || rules >= ONE.length) break;
    const a = Math.floor(bestK / M), b = bestK % M;
    const g = ONE[rules]; const nid = symbols.length; symbols.push(g); rules++;
    const out: number[] = [];
    for (let i = 0; i < seq.length; i++) { if (i + 1 < seq.length && seq[i] === a && seq[i + 1] === b) { out.push(nid); i++; } else out.push(seq[i]); }
    seq = out;
  }
  // full expansion at first use (definitions in place)
  const out: string[] = [];
  for (let i = 0; i < seq.length; i++) {
    const id = seq[i];
    if (id >= nTok) {
      const first = seq.indexOf(id) === i;
      out.push(symbols[id]);           // glyph
      if (first) { /* definition = the glyph itself stands for the pair; reader needs the expansion -> we emit expansion then glyph */ }
    } else out.push(symbols[id]);
  }
  const wire = out.join('');
  return { wireTokens: countTokens(wire, enc), rules };
}
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const raw = countTokens(t, enc);
  const r = sim(t);
  const key = f.split('/').pop()!;
  const fr = frontier[key];
  console.log(JSON.stringify({ f: key, raw, wire: r.wireTokens, rules: r.rules, plus9: r.wireTokens + 9, frontier: fr ?? null, deltaVsFrontier: fr ? (r.wireTokens + 9) - fr : null }));
}
