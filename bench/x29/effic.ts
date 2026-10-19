import fs from 'node:fs';
import { syntomosEncode } from '@/lib/omega/syntomos';
import { chironParseTape } from '@/lib/omega/chiron';
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
const gs = new Set(parsed.map(p=>p.glyph));
let r2=0,r3=0,r4=0,r2t=0,r3t=0,r4t=0;
const runs: string[] = []; let cur='';
for (const ch of body) { if (gs.has(ch)) cur+=ch; else { if(cur.length>1) runs.push(cur); cur=''; } }
if (cur.length>1) runs.push(cur);
for (const s of runs) {
  if (s.length===2){ r2++; r2t+=T(s); }
  else if (s.length===3){ r3++; r3t+=T(s); }
  else if (s.length===4){ r4++; r4t+=T(s); }
}
console.log(f.split('/').pop(), '| glyphs-in-runs', runs.reduce((a,s)=>a+s.length,0), '| multi-runs', runs.length);
console.log('  len2 runs', String(r2).padStart(4), 'avg tok', r2?(r2t/r2).toFixed(3):'-');
console.log('  len3 runs', String(r3).padStart(4), 'avg tok', r3?(r3t/r3).toFixed(3):'-');
console.log('  len4 runs', String(r4).padStart(4), 'avg tok', r4?(r4t/r4).toFixed(3):'-');
// theoretical: how many DISTINCT bigrams/trigrams of the pool are 1 token?
const pool = parsed.map(p=>p.glyph);
let b1=0,btot=0;
for (const a of pool) for (const b of pool){ btot++; if(T(a+b)===1) b1++; }
console.log('  pool', pool.length, 'distinct pool bigrams that are 1 token:', b1, '/', btot, '=', (100*b1/btot).toFixed(1)+'%');
