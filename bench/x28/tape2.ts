import fs from 'node:fs';
import { metathesisEncode } from '@/lib/omega/metathesis';
import { chironParseTape, CHIRON_SCRIPTS } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const f = process.env.F!;
const t = fs.readFileSync(f, 'utf8');
const r: any = metathesisEncode(t, enc);
const si = r.wire.indexOf('¶'); const tape = r.wire.slice(1, si), body = r.wire.slice(si + 1);
const sc: any = scriptOfChar(tape[0]);
const parsed: any[] = chironParseTape(tape, sc);
const ex = new Map<string,string>();
for (const p of parsed) { let s = p.raw; for (let k=0;k<12;k++){ let n=''; for (const c of s) n += ex.get(c) ?? c; if (n===s) break; s=n; } ex.set(p.glyph, s); }
const phrases = parsed.map(p => ex.get(p.glyph)!);
const glyphs = parsed.map(p => p.glyph);
const tapeOld = T(tape);
console.log(f.split('/').pop(), '| rules', parsed.length, '| tapeOld', tapeOld, '| body', T(body));
// candidate shared substrings among EXPANDED phrases (pure text, glyph-free by construction)
const seen = new Map<string, Set<number>>();
for (let pi = 0; pi < phrases.length; pi++) {
  const P = phrases[pi]; const loc = new Set<string>();
  for (let L = 3; L <= Math.min(80, P.length); L++) for (let i = 0; i + L <= P.length; i++) loc.add(P.slice(i, i+L));
  for (const s of loc) { if (!seen.has(s)) seen.set(s, new Set()); seen.get(s)!.add(pi); }
}
const cands: Array<{s:string,m:number,net:number}> = [];
for (const [s, set] of seen) {
  if (set.size < 2) continue;
  const sTok = T(s); if (sTok < 2) continue;
  // EXACT model: new tape = X + S + sum(gi + Ei')   (all other nesting dropped)
  const ne = phrases.map(P => P.split(s).join(''));
  let tapeNew = 1 + T(s); // glyph X + its definition S
  for (let i = 0; i < ne.length; i++) tapeNew += T(glyphs[i] + ne[i].replace(//g, 'X'));
  const net = tapeOld - tapeNew;
  if (net > 0) cands.push({ s, m: set.size, net });
}
cands.sort((a,b)=>b.net-a.net);
console.log('candidates with POSITIVE exact tape saving:', cands.length);
for (const c of cands.slice(0, 10)) console.log('  save', String(c.net).padStart(4), 'tok  m', String(c.m).padStart(3), JSON.stringify(c.s.slice(0,46)));
// greedy sequential application
let cur = phrases.slice(); let total = 0; let steps = 0;
for (let round = 0; round < 8; round++) {
  const seen2 = new Map<string, Set<number>>();
  for (let pi = 0; pi < cur.length; pi++) { const P = cur[pi]; const loc = new Set<string>();
    for (let L = 3; L <= Math.min(80, P.length); L++) for (let i = 0; i+L <= P.length; i++) loc.add(P.slice(i,i+L));
    for (const s of loc) { if (!seen2.has(s)) seen2.set(s, new Set()); seen2.get(s)!.add(pi); } }
  let best: any = null;
  for (const [s, set] of seen2) { if (set.size < 2) continue; if (T(s) < 2) continue;
    const ne = cur.map(P => P.split(s).join(''));
    let tn = 1 + T(s); for (let i=0;i<ne.length;i++) tn += T(glyphs[i] + ne[i].replace(//g,'X'));
    // compare against current (not original) tape representation
    let tc = 1 + T(s); for (let i=0;i<cur.length;i++) tc += T(glyphs[i] + cur[i]);
    const gain = (T(tape)) - tn; // vs ORIGINAL always
    const gainVsCur = tc - tn;
    if (gainVsCur > 0 && (!best || gain > best.gain)) best = { s, gain, gainVsCur }; }
  if (!best) break;
  cur = cur.map(P => P.split(best.s).join(''));
  total = tapeOld - (() => { let tn = 0; for (let i=0;i<cur.length;i++) tn += T(glyphs[i] + cur[i]); return tn + 0; })();
  steps++;
  console.log('  round', round+1, 'added rule', JSON.stringify(best.s.slice(0,40)), 'cumulative tape saving', total);
}
console.log('GREEDY rounds', steps, 'cumulative tape saving', total);
