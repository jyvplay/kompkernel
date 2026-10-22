import fs from 'node:fs';
import { syntomosEncode } from '@/lib/omega/syntomos';
import { chironParseTape } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const f=process.env.F!; const BUDGET=Number(process.env.BUDGET||120);
const t=fs.readFileSync(f,'utf8');
const r:any=syntomosEncode(t,enc);
const si=r.wire.indexOf('¶'); const tape=r.wire.slice(1,si), body=r.wire.slice(si+1);
const sc:any=scriptOfChar(tape[0]);
const parsed:any[]=chironParseTape(tape,sc)||[];
const glyphs=parsed.map(p=>p.glyph);
const gs=new Set(glyphs);
// skeleton: tokens are either literal strings or a glyph index
const skel:Array<{k:'l',v:string}|{k:'g',v:number}>=[];
let lit=''; const gi=new Map(glyphs.map((g,i)=>[g,i]));
for(const ch of body){ if(gs.has(ch)){ if(lit){skel.push({k:'l',v:lit}); lit='';} skel.push({k:'g',v:gi.get(ch)!}); } else lit+=ch; }
if(lit) skel.push({k:'l',v:lit});
const nG=glyphs.length;
const build=(asg:string[])=>{ let s=''; for(const p of skel) s += p.k==='l'?p.v:asg[p.v]; return s; };
let asg=glyphs.slice(); let cur=T(build(asg)); const start=cur;
console.log(f.split('/').pop(),'| glyphs',nG,'| occurrences',skel.filter(p=>p.k==='g').length,'| start body tok',cur);
// unused pool chars available for swapping in
const extra:string[]=[];
for(const [a,b] of (sc.ranges??[[sc.lo,sc.hi]]) as Array<[number,number]>)
  for(let cp=a;cp<b;cp++){ const ch=String.fromCodePoint(cp); if(!gs.has(ch)&&T(ch)===1&&!t.includes(ch)) extra.push(ch); }
console.log('  spare pool chars', extra.length);
const t0=Date.now(); let swaps=0;
outer: for(let pass=0; pass<6; pass++){
  let improved=false;
  const order=asg.map((_,i)=>i);
  for(let i=0;i<nG;i++) for(let j=i+1;j<nG;j++){
    if(Date.now()-t0>BUDGET*1000) break outer;
    const tmp=asg[i]; asg[i]=asg[j]; asg[j]=tmp; const v=T(build(asg)); swaps++;
    if(v<cur){ cur=v; improved=true; } else { const b=asg[i]; asg[i]=asg[j]; asg[j]=b; }
  }
  // try injecting a spare char
  for(let i=0;i<nG && extra.length;i++){
    if(Date.now()-t0>BUDGET*1000) break outer;
    const orig=asg[i];
    for(const e of extra.slice(0,40)){ asg[i]=e; const v=T(build(asg)); swaps++;
      if(v<cur){ cur=v; improved=true; break; } }
    if(asg[i]!==orig && !(function(){const v=T(build(asg));return v<=cur;})()) asg[i]=orig;
  }
  console.log('  pass',pass,'cur',cur,'delta',cur-start);
  if(!improved) break;
}
console.log('RESULT: body tok',start,'->',cur,'| gain',start-cur,'| swaps tried',swaps,'| secs',((Date.now()-t0)/1000).toFixed(0));
