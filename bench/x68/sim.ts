import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
// measured 1-token glyph pool (Cyrillic lowercase; verified 1 token each)
const POOL: string[] = [];
for (let cp = 0x0430; cp <= 0x045F; cp++) POOL.push(String.fromCodePoint(cp));
for (let cp = 0x0250; cp <= 0x02AF; cp++) POOL.push(String.fromCodePoint(cp));
const ONE = POOL.filter(c => countTokens(c, enc) === 1);

interface Sym { surf: string }
function sim(t: string, minGain = 1) {
  const toks = tokenStrings(t, enc).map(x => x.s);
  const symbols: string[] = toks.slice();       // symbol id -> surface
  const idOf = new Map<string, number>();
  let seq = toks.map(s => { let v = idOf.get(s); if (v === undefined) { v = symbols.length; idOf.set(s, v); symbols.push(s); } return v; });
  let rules = 0;
  for (let iter = 0; iter < 2000; iter++) {
    const cnt = new Map<number, number>();
    const M = 1 << 22;
    for (let i = 0; i + 1 < seq.length; i++) { const k = seq[i] * M + seq[i + 1]; cnt.set(k, (cnt.get(k) ?? 0) + 1); }
    let bestK = -1, bestC = 0;
    for (const [k, c] of cnt) if (c > bestC) { bestC = c; bestK = k; }
    if (bestK < 0 || bestC - 2 < minGain) break;   // profit = c-2 (definition costs 1, first use free)
    const a = Math.floor(bestK / M), b = bestK % M;
    const g = ONE[rules % ONE.length];
    if (ONE.length <= rules) break;
    const nid = symbols.length; symbols.push(g); rules++;
    const out: number[] = [];
    for (let i = 0; i < seq.length; i++) {
      if (i + 1 < seq.length && seq[i] === a && seq[i + 1] === b) { out.push(nid); i++; } else out.push(seq[i]);
    }
    seq = out;
  }
  // render: first use of a rule = its expansion followed by its glyph; later uses = glyph
  const seen = new Set<number>();
  let wire = '';
  for (const id of seq) {
    if (id >= toks.length) { // rule symbol (ids >= distinct token count are rules)
      if (!seen.has(id)) { seen.add(id); wire += symbols[id]; } else wire += symbols[id];
    } else wire += symbols[id];
  }
  // NOTE: expansion is *not* done here; we measure the symbol-level wire: literal surfaces + glyphs.
  return { wireTokens: countTokens(wire, enc), rules, syms: seq.length, wireChars: wire.length };
}
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const raw = countTokens(t, enc);
  const r = sim(t);
  console.log(JSON.stringify({ f, raw, ...r, note: 'symbol-level wire (no expansion), defs at first use not yet expanded' }));
}
