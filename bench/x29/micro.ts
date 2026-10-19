import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const f=process.env.F!;
const CONTRACT=Number(process.env.CT||17);      // contract tokens
const MINTOK=Number(process.env.MINT||1);
const t=fs.readFileSync(f,'utf8');
// candidate glyph pool: single-token chars absent from payload, prefer Cyrillic
const used=new Set([...t]);
const pool:string[]=[];
for (const [lo,hi] of [[0x400,0x460],[0x370,0x3d0]] as Array<[number,number]>)
  for(let cp=lo;cp<hi;cp++){const ch=String.fromCodePoint(cp); if(!used.has(ch)&&T(ch)===1) pool.push(ch);}
// correct occurrence counting: all START positions (overlapping allowed for counting)
function countAll(hay:string,needle:string){let c=0,i=0;for(;;){const j=hay.indexOf(needle,i);if(j<0)break;c++;i=j+1;}return c;}
let body=t; let tape=''; let gi=0;
const base=T(t);
let curTotal=base;                                  // identity cost (no contract)
let tapeTok=0, bodyTok=base;
let deltas=0;
for(let round=0; round<400 && gi<pool.length; round++){
  // enumerate distinct substrings with count>=2
  const cand=new Map<string,number>();
  for(let L=2;L<=Math.min(64,body.length);L++){
    const seen=new Set<string>();
    for(let i=0;i+L<=body.length;i++){const s=body.slice(i,i+L); if(!seen.has(s)){seen.add(s); const c=countAll(body,s); if(c>=2) cand.set(s,c);}}
  }
  let best:any=null;
  const X=pool[gi];
  for(const [s,c] of cand){
    if (T(s) < MINTOK) continue;
    const nb=body.split(s).join(X);
    const nt=tape+X+s;
    const tot=CONTRACT+2+T(nt)+T(nb);
    if(tot<curTotal && (!best||tot<best.tot)) best={s,c,tot,nb,nt};
  }
  if(!best) break;
  body=best.nb; tape=best.nt; curTotal=best.tot; gi++; deltas++;
}
const withTape = CONTRACT+2+T(tape)+T(body);
console.log(f.split('/').pop().padEnd(24),'raw',String(T(t)).padStart(5),
 '| micro msg',String(withTape).padStart(5),'| rules',String(deltas).padStart(3),
 '| tape',String(T(tape)).padStart(4),'body',String(T(body)).padStart(5),
 '| vs raw',String(withTape-T(t)).padStart(5));
