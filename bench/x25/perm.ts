import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const W=+(process.env.W||27);
const wf=`bench/x24/wires/${W.toString().padStart(2,'0')}.wire`;
const w=fs.readFileSync(wf,'utf8');
const base=T(w);
// collect the glyph alphabet actually used in the wire (non-ASCII, non-¶, non-§)
const used=new Set<string>();
for(const ch of w){ const cp=ch.codePointAt(0)!; if(cp>0x0180 && ch!=='¶' && ch!=='§') used.add(ch); }
const gl=[...used];
console.log('wire',W,'tokens',base,'distinct glyphs',gl.length);
// frequency
const freq=new Map<string,number>();
for(const ch of w) freq.set(ch,(freq.get(ch)||0)+1);
const tot=[...freq.values()].reduce((a,b)=>a+b,0);
console.log('total glyph occurrences',tot);
// baseline: token cost of the wire with each glyph replaced by a cheap ASCII letter
let alt=w; const pool='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
const map=new Map<string,string>(); gl.forEach((g,i)=>map.set(g,pool[i%pool.length]));
alt=[...w].map(c=>map.get(c)??c).join('');
console.log('wire with glyphs -> ASCII letters:',T(alt),' (delta vs base:',T(alt)-base,')');
// random permutations of the glyph->glyph assignment
let best=base,worst=base,sum=0,N=0;
const shuffles=+(process.env.N||60);
let rnd=12345; const rndf=()=>(rnd=(rnd*1103515245+12345)&0x7fffffff)/0x7fffffff;
for(let s=0;s<shuffles;s++){
  const perm=gl.slice(); for(let i=perm.length-1;i>0;i--){const j=Math.floor(rndf()*(i+1));[perm[i],perm[j]]=[perm[j],perm[i]];}
  const m=new Map<string,string>(); gl.forEach((g,i)=>m.set(g,perm[i]));
  const t=T([...w].map(c=>m.get(c)??c).join(''));
  sum+=t;N++; if(t<best)best=t; if(t>worst)worst=t;
}
console.log(`random glyph permutations (n=${N}): mean ${(sum/N).toFixed(0)}  min ${best}  max ${worst}  base ${base}`);
console.log('=> spread',worst-best,'tokens;  best-vs-base',best-base);
