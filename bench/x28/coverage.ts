import fs from 'node:fs';
import { metathesisEncode } from '@/lib/omega/metathesis';
import { chironParseTape } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const f = process.env.F!;
const t = fs.readFileSync(f, 'utf8');
const r: any = metathesisEncode(t, enc);
const si = r.wire.indexOf('¶'); const tape = r.wire.slice(1, si);
const sc: any = scriptOfChar(tape[0]);
const parsed: any[] = chironParseTape(tape, sc) || [];
const ex = new Map<string,string>();
for (const p of parsed) { let s = p.raw; for (let k=0;k<12;k++){ let n=''; for (const c of s) n += ex.get(c) ?? c; if (n===s) break; s=n; } ex.set(p.glyph, s); }
const chosen = new Set([...ex.values()]);
console.log(f.split('/').pop(), '| chosen rules', parsed.length);
// enumerate repeated substrings of the ORIGINAL text
const MAXL = Number(process.env.MAXL || 48), MINC = Number(process.env.MINC || 3);
const counts = new Map<string, number>();
for (let L = 4; L <= MAXL; L++) {
  const seen = new Set<string>();
  for (let i = 0; i + L <= t.length; i++) { const s = t.slice(i, i+L); if (!seen.has(s)) { seen.add(s); counts.set(s, (counts.get(s)||0)+1); } }
}
console.log('distinct substrings len 4..' + MAXL + ' with count>=1:', counts.size);
// profit model: body saves occ*(T(S)-1); tape costs 1 + T(S)
const prof: Array<{s:string,c:number,st:number,net:number,inChosen:boolean}> = [];
for (const [s, c] of counts) {
  if (c < MINC) continue;
  const st = T(s); if (st < 2) continue;
  const net = c * (st - 1) - (1 + st);
  if (net > 0) prof.push({ s, c, st, net, inChosen: chosen.has(s) });
}
prof.sort((a,b)=>b.net-a.net);
const notChosen = prof.filter(p => !p.inChosen);
console.log('PROFITABLE candidates (net>0):', prof.length, '| of which NOT already a rule:', notChosen.length);
for (const p of prof.slice(0, 16))
  console.log('  net', String(p.net).padStart(4), 'occ', String(p.c).padStart(3), 'tok', p.st, p.inChosen ? '[CHOSEN]' : '[MISSED]', JSON.stringify(p.s.slice(0,44)));
