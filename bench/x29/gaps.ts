import fs from 'node:fs';
import { syntomosEncode } from '@/lib/omega/syntomos';
import { chironParseTape, chironDecode } from '@/lib/omega/chiron';
import { symplokeDecode } from '@/lib/omega/symploke';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const f = process.env.F!;
const t = fs.readFileSync(f, 'utf8');
const r: any = syntomosEncode(t, enc);
const si = r.wire.indexOf('¶'); const tape = r.wire.slice(1, si), body = r.wire.slice(si+1);
const sc: any = scriptOfChar(tape[0]);
const parsed: any[] = chironParseTape(tape, sc) || [];
const glyphSet = new Set(parsed.map(p => p.glyph));
const payload = new Set<string>([...t]);
const pool: string[] = [];
for (const [a,b] of (sc.ranges ?? [[sc.lo, sc.hi]]) as Array<[number,number]>)
  for (let cp=a; cp<b; cp++){ const ch=String.fromCodePoint(cp);
    if(!payload.has(ch) && !glyphSet.has(ch) && T(ch)===1) pool.push(ch); }
console.log(f.split('/').pop(), '| rules', parsed.length, '| tape', T(tape), '| body', T(body), '| pool', pool.length);
const base = T(tape) + T(body);
const pos: number[] = []; [...body].forEach((c,i)=>{ if(glyphSet.has(c)) pos.push(i); });
const gapCount = new Map<string, number>();
for (let k=0;k+1<pos.length;k++){
  const a = pos[k]+1, b = pos[k+1];
  if (b<=a) continue;
  const gap = body.slice(a,b);
  if (gap.length > 40) continue;
  gapCount.set(gap, (gapCount.get(gap)||0)+1);
}
const cands = [...gapCount.entries()].filter(([,c])=>c>=2).sort((a,b)=>b[1]-a[1]);
console.log('distinct gaps between glyphs:', gapCount.size, '| repeating >=2:', cands.length);
for (const [g,c] of cands.slice(0,12)) console.log('   n='+c, 'tok='+T(g), JSON.stringify(g.slice(0,40)));
const undo = (w: string) => (r.parent === 'identity' ? w : chironDecode(w));
let best: any = null;
for (const [g] of cands) {
  const X = pool[0]; if (!X) break;
  const nb = body.split(g).join(X);
  const nt = tape + X + g;
  const d = (T(nt)+T(nb)) - base;
  if (!best || d < best.d) best = { g, d, nb, nt, X };
}
if (best) {
  console.log('BEST single gap rule: delta', best.d, 'tok', T(best.g), JSON.stringify(best.g.slice(0,50)));
  if (best.d < 0) {
    const wire = '§' + best.nt + '¶' + best.nb;
    console.log('  exact:', symplokeDecode(wire, { stats: r.stats, order: r.order, undo }) === t);
  }
} else console.log('no candidates');
