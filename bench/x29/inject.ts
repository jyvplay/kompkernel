import fs from 'node:fs';
import { syntomosEncode } from '@/lib/omega/syntomos';
import { chironParseTape, chironDecode } from '@/lib/omega/chiron';
import { symplokeDecode } from '@/lib/omega/symploke';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const f = process.env.F!;
const MAXROUNDS = Number(process.env.ROUNDS || 30);
const MINC = Number(process.env.MINC || 2);
const MAXL = Number(process.env.MAXL || 40);
const t = fs.readFileSync(f, 'utf8');
const r: any = syntomosEncode(t, enc);
const si = r.wire.indexOf('¶'); let tape = r.wire.slice(1, si); let body = r.wire.slice(si+1);
const sc: any = scriptOfChar(tape[0]);
const parsed: any[] = chironParseTape(tape, sc) || [];
const glyphSet = new Set(parsed.map(p => p.glyph));
const payload = new Set<string>([...t]);
const pool: string[] = [];
for (const [a,b] of (sc.ranges ?? [[sc.lo, sc.hi]]) as Array<[number,number]>)
  for (let cp=a; cp<b; cp++){ const ch=String.fromCodePoint(cp);
    if(!payload.has(ch) && !glyphSet.has(ch) && T(ch)===1) pool.push(ch); }
const undo = (w: string) => (r.parent === 'identity' ? w : chironDecode(w));
let base = T(tape) + T(body);
console.log(f.split('/').pop(), '| rules', parsed.length, '| start wire', base, '| pool', pool.length);
let used = 0, total = 0;
for (let round=0; round<MAXROUNDS; round++) {
  // repeated substrings of the CURRENT body (this is the string that actually costs tokens)
  const cnt = new Map<string, number>();
  for (let L=2; L<=Math.min(MAXL, body.length); L++) {
    const seen = new Set<string>();
    for (let i=0; i+L<=body.length; i++) { const s=body.slice(i,i+L); if(!seen.has(s)){ seen.add(s); cnt.set(s,(cnt.get(s)||0)+1);} }
  }
  let best: any = null;
  const X = pool[used]; if (!X) break;
  for (const [g,c] of cnt) {
    if (c < MINC) continue;
    if (g.length < 2) continue;
    const nb = body.split(g).join(X);
    const nt = tape + X + g;
    const d = (T(nt)+T(nb)) - base;
    if (d < 0 && (!best || d < best.d)) best = { g, d, nb, nt, c };
  }
  if (!best) { console.log('  round', round, ': no improving candidate'); break; }
  body = best.nb; tape = best.nt; used++; total += best.d;
  console.log('  round', String(round+1).padStart(2), 'delta', String(best.d).padStart(4), 'n='+String(best.c).padStart(3),
    'cum', String(total).padStart(5), JSON.stringify(best.g.slice(0,36)));
}
if (used) {
  const wire = '§' + tape + '¶' + body;
  const ok = symplokeDecode(wire, { stats: r.stats, order: r.order, undo }) === t;
  console.log('TOTAL delta', total, '| new rules', used, '| final wire', T(tape)+T(body), '| exact', ok);
}
