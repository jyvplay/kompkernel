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
const parsed: any[] = chironParseTape(tape, sc);
console.log(f.split('/').pop(), '| rules', parsed.length, '| tape tokens', T(tape), '| body', T(body));
// expand rules fully, then look for repeated substrings ACROSS the raw (pre-nesting) phrases
const ex = new Map<string,string>();
for (const p of parsed) { let s = p.raw; for (let k=0;k<12;k++){ let n=''; for (const c of s) n += ex.get(c) ?? c; if (n===s) break; s=n; } ex.set(p.glyph, s); }
const phrases = parsed.map(p => ex.get(p.glyph)!);
console.log('phrase token lengths: min', Math.min(...phrases.map(T)), 'max', Math.max(...phrases.map(T)),
  'mean', (phrases.reduce((a,b)=>a+T(b),0)/phrases.length).toFixed(2));
console.log('sum of phrase tokens', phrases.reduce((a,b)=>a+T(b),0), 'vs tape tokens', T(tape));
// find repeated character substrings ACROSS phrases (not within one phrase)
const seen = new Map<string, Set<number>>();
for (let pi = 0; pi < phrases.length; pi++) {
  const P = phrases[pi];
  const loc = new Set<string>();
  for (let L = 2; L <= Math.min(60, P.length); L++)
    for (let i = 0; i + L <= P.length; i++) loc.add(P.slice(i, i + L));
  for (const s of loc) { if (!seen.has(s)) seen.set(s, new Set()); seen.get(s)!.add(pi); }
}
// score: net = m*(sTok-1) - (sTok+1) where m = #phrases containing s, sTok = T(s)
const cands: Array<{s:string,m:number,sTok:number,net:number}> = [];
for (const [s, set] of seen) {
  const m = set.size; if (m < 2) continue;
  const sTok = T(s); if (sTok < 2) continue;
  const net = m * (sTok - 1) - (sTok + 1);
  if (net > 0) cands.push({ s, m, sTok, net });
}
cands.sort((a,b)=>b.net-a.net);
console.log('profitable shared substrings:', cands.length);
for (const c of cands.slice(0, 14)) console.log('  net', String(c.net).padStart(4), 'm', String(c.m).padStart(3), 'sTok', c.sTok, JSON.stringify(c.s.slice(0,44)));
console.log('SUM net (upper bound, non-independent):', cands.reduce((a,b)=>a+b.net,0));
