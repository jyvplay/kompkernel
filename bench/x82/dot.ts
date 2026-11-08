/** X82 probe: DOT-RUN PACKING.
 *  `\d+(\.\d+)+` runs are separated by dots that each cost a token. Pack by removing the
 *  dots; reverse by splitting according to the DECLARED COMPONENT WIDTHS ("shape").
 *  SPHRAGIS refuses these lanes (its width-uniqueness guard is global); grouping per
 *  shape relaxes that. Guard: a packed run must not touch another digit. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const RUN = /(?<![\d.])\d+(?:\.\d+)+(?![\d.])/g;
type Shape = string;                       // e.g. "1.1.2"
const shapeOf = (s: string) => s.split('.').map(p => p.length).join('.');
const packShape = (S: string, sh: string) => {
  const w = sh.split('.').map(Number);
  return S.replace(RUN, (m) => (shapeOf(m) === sh ? m.replace(/\./g, '') : m));
};
const unpackShape = (S: string, sh: string) => {
  const w = sh.split('.').map(Number);
  const re = new RegExp(`(?<!\\d)(${w.map(n => `\\d{${n}}`).join('')})(?!\\d)`, 'g');
  return S.replace(re, (_m, g: string) => {
    const out: string[] = []; let p = 0;
    for (const n of w) { out.push(g.slice(p, p + n)); p += n; }
    return out.join('.');
  });
};
const LANES = [
  'bench/holdout-x41/apt-real.txt', 'bench/holdout-x41/ls-l-real.txt',
  'bench/holdout/json-pkg.txt', 'bench/holdout-x42/dpkg-l.txt',
  'bench/holdout-tbl/kubectl-get-pods.txt', 'bench/holdout-x41/ps-aux-real.txt',
];
const out: any[] = [];
for (const p of LANES) {
  const S = fs.readFileSync('/home/user/kompkernel/' + p, 'utf8');
  const runs = S.match(RUN) ?? [];
  const byShape = new Map<string, number>();
  for (const r of runs) byShape.set(shapeOf(r), (byShape.get(shapeOf(r)) ?? 0) + 1);
  const shapes = [...byShape.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`\n### ${p.split('/').pop()}  runs=${runs.length}  shapes=${shapes.length}  top: ${shapes.slice(0, 6).map(([s, n]) => `${s}x${n}`).join(' ')}`);
  const base: any = tagstackFrontier(S, enc);
  // try top-k shape sets
  for (const k of [1, 3, 6]) {
    const use = shapes.slice(0, k).map(([s]) => s);
    let T = S; for (const sh of use) T = packShape(T, sh);
    let rt = true;
    for (let i = use.length - 1; i >= 0; i--) { const u = unpackShape(T, use[i]); if (u === T) continue; T = u; }
    rt = T === S;
    const raw = countTokens(T, enc) - countTokens(S, enc);
    const C = `§X82 dot-runs of shape ${use.join(' ')} have the dots removed.`;
    const ct = countTokens(C, enc);
    const f: any = tagstackFrontier(C + '\n' + T, enc);
    const d = f.messageTokens - base.messageTokens;
    console.log(`  k=${k} rt=${rt} raw ${String(raw).padStart(5)} contract ${String(ct).padStart(3)} => F ${base.messageTokens} -> ${f.messageTokens} (${d >= 0 ? '+' : ''}${d})`);
    out.push({ lane: p.split('/').pop(), k, shapes: use, rt, raw, contract: ct, F: base.messageTokens, net: d });
  }
}
fs.writeFileSync('/home/user/kompkernel/bench/x82/receipts/dot.json', JSON.stringify(out, null, 1) + '\n');
