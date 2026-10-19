import fs from 'node:fs';
import { metathesisEncode, metathesisDecode } from '@/lib/omega/metathesis';
import { chironParseTape, chironDecode } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const f = process.env.F!;
const t = fs.readFileSync(f, 'utf8');
const r: any = metathesisEncode(t, enc);
const si = r.wire.indexOf('¶'); const tape = r.wire.slice(1, si), body0 = r.wire.slice(si + 1);
const sc: any = scriptOfChar(tape[0]);
const parsed: any[] = chironParseTape(tape, sc) || [];
const ex = new Map<string,string>();
for (const p of parsed) { let s = p.raw; for (let k=0;k<12;k++){ let n=''; for (const c of s) n += ex.get(c) ?? c; if (n===s) break; s=n; } ex.set(p.glyph, s); }
const bodyCh = [...body0];
const pos: number[] = []; bodyCh.forEach((c, i) => { if (ex.has(c)) pos.push(i); });
console.log(f.split('/').pop(), '| rules', parsed.length, '| bodyTok', T(body0), '| glyph occurrences', pos.length);
// pass 1: measure delta of reverting each single occurrence
const deltas: Array<[number, number]> = [];
for (const i of pos) {
  const nb = bodyCh.slice(); nb[i] = ex.get(bodyCh[i])!;
  deltas.push([i, T(nb.join('')) - T(body0)]);
}
const neg = deltas.filter(([, d]) => d < 0);
const pos2 = deltas.filter(([, d]) => d > 0);
console.log('occurrences where REVERTING helps:', neg.length, '| hurts:', pos2.length, '| neutral:', deltas.length-neg.length-pos2.length);
console.log('sum of negative deltas (greedy upper bound):', neg.reduce((a,[,d])=>a+d,0));
if (neg.length) {
  const seen: string[] = [];
  for (const [i, d] of neg.slice(0, 10)) seen.push(`glyph=${JSON.stringify(bodyCh[i])} phrase=${JSON.stringify(ex.get(bodyCh[i])!)} d=${d}`);
  console.log('examples:'); seen.forEach(s => console.log('   ', s));
}
// greedy: revert all negative (independent approximation), then measure
let cur = bodyCh.slice();
for (const [i] of neg) cur[i] = ex.get(bodyCh[i])!;
const nb = cur.join('');
console.log('after reverting all negative: bodyTok', T(nb), 'delta vs original', T(nb) - T(body0));
const wireNew = '§' + tape + '¶' + nb;
const undo = (w: string) => (r.parent === 'identity' ? w : chironDecode(w));
console.log('exact:', metathesisDecode(wireNew, { stats: r.stats, order: r.order, undo }) === t);
