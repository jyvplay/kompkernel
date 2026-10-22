import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const W=+(process.env.W||27), BUD=+(process.env.BUD||240);
const wf=`bench/x24/wires/${W.toString().padStart(2,'0')}.wire`;
const w=fs.readFileSync(wf,'utf8');
const used=new Set<string>();
for(const ch of w){const cp=ch.codePointAt(0)!; if(cp>0x0180&&ch!=='¶'&&ch!=='§') used.add(ch);}
const gl=[...used];
// rebuild wire as array of chars; precompute positions of each glyph for fast rebuild
const chars=[...w];
const pos=new Map<string,number[]>();
chars.forEach((c,i)=>{if(used.has(c)){(pos.get(c)||(pos.set(c,[]),pos.get(c)!)).push(i);}});
const order=gl.slice().sort((a,b)=>pos.get(b)!.length-pos.get(a)!.length);
let cur=order.slice();  // cur[k] = pool char used for order[k]  (identity at start)
const render=(asg:string[])=>{const m=new Map<string,string>(); order.forEach((g,i)=>m.set(g,asg[i]));
  const o=chars.slice(); for(const g of order){ for(const i of pos.get(g)!) o[i]=m.get(g)!; } return o.join('');};
let best=T(w), base=best;
const t0=Date.now(); let evals=0, acc=0;
let rnd=98765; const rndf=()=>(rnd=(rnd*1103515245+12345)&0x7fffffff)/0x7fffffff;
while((Date.now()-t0)/1000<BUD){
  const i=Math.floor(rndf()*cur.length), j=Math.floor(rndf()*cur.length);
  if(i===j) continue;
  const t=cur.slice(); const tmp=t[i]; t[i]=t[j]; t[j]=tmp;
  const s=render(t); const v=T(s); evals++;
  if(v<best){best=v; cur=t; acc++;}
}
console.log(`wire ${W}: base ${base} -> best ${best}  (saved ${base-best})  evals ${evals}  accepted ${acc}  in ${((Date.now()-t0)/1000).toFixed(0)}s`);
fs.writeFileSync(`bench/x25/bestperm-${W}.txt`, cur.join(''));
console.log('saved perm to bench/x25/bestperm-'+W+'.txt');
