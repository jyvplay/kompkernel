import fs from 'node:fs';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironParseTape, chironDecode } from '@/lib/omega/chiron';
import { symplokeDecode } from '@/lib/omega/symploke';
import * as CH from '@/lib/omega/chiron';
const enc='o200k_base' as any;
const f=process.env.F||'';
const text=fs.readFileSync(f,'utf8');
const r:any=oikonomiaEncode(text,enc);
const w:string=r.wire; const cut=w.indexOf(CHIRON_SEP,1);
const tape0=w.slice(1,cut), body=w.slice(cut+1);
const cp0=tape0.codePointAt(0)!;
let script:any=null;
for(const s of (CH as any).CHIRON_SCRIPTS){ if((CH as any).chironInScript(s,cp0)){ script=s; break; } }
const rules=chironParseTape(tape0,script)!;
const n=rules.length; const glyphs=rules.map(x=>x.glyph);
// deps[i] = set of j whose glyph appears in raw_i (j != i)
const deps:number[][]=rules.map((x,i)=>{const o:number[]=[];for(let j=0;j<n;j++) if(j!==i&&x.raw.includes(glyphs[j])) o.push(j); return o;});
const build=(perm:number[])=>{let t='';for(const i of perm)t+=rules[i].glyph+rules[i].raw;return CHIRON_START+t+CHIRON_SEP+body;};
const decodedRef=symplokeDecode(w,{stats:r.stats,order:r.order,undo:chironDecode});
const valid=(s:string)=>symplokeDecode(s,{stats:r.stats,order:r.order,undo:chironDecode})===decodedRef;
const base=rules.map((_,i)=>i);
const baseTok=countTokens(build(base),enc);
console.log('lane',f.split('/').pop(),'msg',r.messageTokens,'rules',n,'baseWireTok',baseTok,'refValid',valid(w));
let rng=Number(process.env.SEED||7); const rnd=()=>(rng=(rng*1103515245+12345)&0x7fffffff)/0x7fffffff;
const toks:number[]=[];
const N=Number(process.env.N||300);
for(let k=0;k<N;k++){
  // Kahn with random tie-break over the DAG j -> i for j in deps[i]
  const indeg=new Array(n).fill(0); const adj:number[][]=Array.from({length:n},()=>[]);
  for(let i=0;i<n;i++) for(const j of deps[i]){ adj[j].push(i); indeg[i]++; }
  const ready:number[]=[]; for(let i=0;i<n;i++) if(indeg[i]===0) ready.push(i);
  const ord:number[]=[];
  while(ready.length){
    const p=Math.floor(rnd()*ready.length); const v=ready[p]; ready[p]=ready[ready.length-1]; ready.pop();
    ord.push(v);
    for(const u of adj[v]){ if(--indeg[u]===0) ready.push(u); }
  }
  if(ord.length!==n) continue;
  const s=build(ord); const t=countTokens(s,enc);
  if(valid(s)) toks.push(t);
}
toks.sort((a,b)=>a-b);
if(toks.length) console.log('  topo orders',toks.length,'min',toks[0],'median',toks[toks.length>>1],'max',toks[toks.length-1],
  '| base',baseTok,'| BEST SAVING',baseTok-toks[0],`(${((baseTok-toks[0])/baseTok*100).toFixed(2)}%)`);
else console.log('  no valid topo order found');
