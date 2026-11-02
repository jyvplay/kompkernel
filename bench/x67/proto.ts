import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';

const CONTRACT = 'PROBOLE-1: each `@@P<period> <count>` line starts a band. In a band, a line beginning `=` is the same in every record; a line beginning `|` introduces <count> following lines, which are that position\'s values across records. Rebuild <count> records of <period> positions in order, strip one leading marker, and copy everything else unchanged.';

function findBand(lines: string[], lo: number, hi: number) {
  const n = hi - lo;
  let best: { s: number; p: number; k: number; save: number } | null = null;
  for (let p = 2; p <= Math.min(200, Math.floor(n / 2)); p++) {
    for (let s = lo; s + 2 * p <= hi; s++) {
      const k = Math.floor((hi - s) / p);
      if (k < 2) break;
      let save = 0;
      for (let j = 0; j < p; j++) {
        const first = lines[s + j];
        let inv = true;
        for (let r = 1; r < k; r++) if (lines[s + r * p + j] !== first) { inv = false; break; }
        if (inv) save += (k - 1) * (first.length + 1);
      }
      save -= 40;
      if (save > 0 && (!best || save > best.save)) best = { s, p, k, save };
    }
  }
  return best;
}

function render(text: string) {
  const lines = text.split('\n');
  const b = findBand(lines, 0, lines.length);
  if (!b) return { text, band: null as any, raw: countTokens(text, enc) };
  const w: string[] = [];
  for (let i = 0; i < b.s; i++) w.push('.' + lines[i]);
  w.push(`@@P${b.p} ${b.k}`);
  for (let j = 0; j < b.p; j++) {
    const first = lines[b.s + j];
    let inv = true;
    for (let r = 1; r < b.k; r++) if (lines[b.s + r * b.p + j] !== first) { inv = false; break; }
    if (inv) w.push('=' + first);
    else { w.push('|'); for (let r = 0; r < b.k; r++) w.push(lines[b.s + r * b.p + j]); }
  }
  for (let i = b.s + b.k * b.p; i < lines.length; i++) w.push('.' + lines[i]);
  const t = w.join('\n');
  return { text: t, band: b, raw: countTokens(t, enc) };
}

for (const path of process.argv.slice(2)) {
  const src = fs.readFileSync(path, 'utf8');
  const t0 = Date.now();
  const r = render(src);
  const ct = countTokens(CONTRACT, enc);
  console.log(JSON.stringify({ path, chars: src.length, rawTokens: countTokens(src, enc),
    transformedTokens: r.raw, contractTokens: ct, total: r.raw + ct, band: r.band, ms: Date.now() - t0 }));
}
