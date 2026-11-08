/** frontier + discovered-shape packing, on the lanes discovery flagged */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const SEPS = ['-', ':', '.', '/', '_', ','];
const MIN = 6;
const cls = (c: string) => (/\d/.test(c) ? 'D' : 'L');
const shapeOf = (t: string, sep: string) => t.split(sep).map(g => {
  let s = ''; for (const c of g) { const cc = cls(c); if (!s.endsWith(cc)) s += cc; }
  return s + g.length;
}).join(sep);

function discover(S: string) {
  const out: { sep: string; shape: string; n: number; sample: string; raw: number; len: number }[] = [];
  for (const sep of SEPS) {
    const re = new RegExp(`[A-Za-z0-9]+(?:\\${sep}[A-Za-z0-9]+)+`, 'g');
    const byShape = new Map<string, string[]>();
    for (const t of (S.match(re) ?? [])) {
      if (!t.includes(sep)) continue;
      const g = t.split(sep);
      if (g.some(x => !/^[A-Za-z0-9]+$/.test(x) || x === '')) continue;
      const sh = shapeOf(t, sep);
      if (!byShape.has(sh)) byShape.set(sh, []);
      byShape.get(sh)!.push(t);
    }
    for (const [sh, grp] of byShape) {
      if (grp.length < MIN) continue;
      const before = countTokens(grp.join(' '), enc);
      const after = countTokens(grp.map(g => g.split(sep).join('')).join(' '), enc);
      const raw = after - before;
      if (raw >= -1) continue;                      // must actually save
      if (grp.some(g => g.split(sep).join('').length !== grp[0].split(sep).join('').length)) continue;
      out.push({ sep, shape: sh, n: grp.length, sample: grp[0], raw, len: grp[0].split(sep).join('').length });
    }
  }
  out.sort((a, b) => a.raw - b.raw);
  return out;
}
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const n = p.split('/').pop()!;
  const cands = discover(S).slice(0, 6);
  console.log(`\n### ${n} chars ${S.length} raw ${countTokens(S, enc)}`);
  for (const c of cands) console.log(`   cand sep'${c.sep}' ${c.shape.padEnd(20)} n=${c.n} packedLen=${c.len} rawΔ ${c.raw} e.g. ${c.sample}`);
}
