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
const si = r.wire.indexOf('¶'); const tape = r.wire.slice(1, si), body = r.wire.slice(si + 1);
const sc: any = scriptOfChar(tape[0]);
const parsed: any[] = chironParseTape(tape, sc) || [];
const idx = new Map<string, number>(); parsed.forEach((p, i) => idx.set(p.glyph, i));
const runs: number[][] = []; let cur: number[] = [];
for (const ch of body) { if (idx.has(ch)) cur.push(idx.get(ch)!); else { if (cur.length) runs.push(cur); cur = []; } }
if (cur.length) runs.push(cur);
const multi = new Map<string, number>();
for (const rn of runs) { const k = rn.join(','); multi.set(k, (multi.get(k)||0)+1); }
const rep = [...multi.entries()].filter(([,c]) => c >= 2).sort((a,b)=>b[1]-a[1]);
console.log(f.split('/').pop(), '| runs', runs.length, '| distinct run-sequences', multi.size, '| repeated', rep.length);
// profit of composing a repeated run into one new glyph:
//   cost = 1 (new glyph) + T(concat of the run's glyph chars)
//   save = (count) * (T(runchars) - 1)
let tot = 0;
for (const [k, c] of rep.slice(0, 12)) {
  const glyphStr = k.split(',').map(i => parsed[+i].glyph).join('');
  const rt = T(glyphStr);
  const cost = 1 + rt;
  const save = c * (rt - 1);
  if (save - cost > 0) tot += save - cost;
  console.log('  len', String(k.split(',').length).padStart(3), 'count', String(c).padStart(4),
    'runTok', String(rt).padStart(3), 'save', String(save).padStart(5), 'cost', String(cost).padStart(3),
    'net', String(save-cost).padStart(5));
}
let all = 0; for (const [k,c] of rep) { const g = k.split(',').map(i=>parsed[+i].glyph).join(''); const rt=T(g); const net = c*(rt-1) - (1+rt); if (net>0) all += net; }
console.log('TOTAL net from composing ALL profitable distinct repeated runs (non-independent):', all);
// also: repeated SUBSEQUENCES within runs (suffix/prefix sharing)
const sub = new Map<string, number>();
for (const rn of runs) { const loc = new Set<string>();
  for (let L=2; L<=Math.min(12, rn.length); L++) for (let i=0;i+L<=rn.length;i++) loc.add(rn.slice(i,i+L).join(','));
  for (const s of loc) sub.set(s, (sub.get(s)||0)+1); }
let subTot = 0; const subBest: Array<[number,string,number]> = [];
for (const [k,c] of sub) { if (c<2) continue; const g=k.split(',').map(i=>parsed[+i].glyph).join(''); const rt=T(g); const net=c*(rt-1)-(1+rt); if (net>0) { subTot+=net; subBest.push([net,g,c]); } }
subBest.sort((a,b)=>b[0]-a[0]);
console.log('repeated run-SUBSEQUENCES with positive net:', subBest.length, 'sum(non-independent)', subTot);
for (const [net,g,c] of subBest.slice(0,10)) console.log('   net', String(net).padStart(5), 'count', String(c).padStart(4), 'tok', T(g), JSON.stringify(g));
