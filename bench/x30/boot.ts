import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { synkopeEncode } from '@/lib/omega/synkope';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const f=process.env.F!;
const CONTRACT=Number(process.env.CT||17);
const t=fs.readFileSync(f,'utf8');
const base:any=synkopeEncode(t,enc);
const used=new Set([...t]);
const pool:string[]=[];
for(const [lo,hi] of [[0x400,0x460],[0x370,0x3d0]] as Array<[number,number]>)
  for(let cp=lo;cp<hi;cp++){const ch=String.fromCodePoint(cp); if(!used.has(ch)&&T(ch)===1)pool.push(ch);}
function countAll(h:string,n:string){let c=0,i=0;for(;;){const j=h.indexOf(n,i);if(j<0)break;c++;i=j+1;}return c;}
// SUBSIDIZED: accept any rule whose MARGINAL gain is positive (ignore fixed cost entirely)
let body=t, tape='', gi=0; let wireTok=T(t);
for(let round=0; round<400 && gi<pool.length; round++){
  const cand=new Map<string,number>();
  for(let L=2;L<=Math.min(64,body.length);L++){
    const seen=new Set<string>();
    for(let i=0;i+L<=body.length;i++){const s=body.slice(i,i+L); if(!seen.has(s)){seen.add(s);const c=countAll(body,s); if(c>=2)cand.set(s,c);}}
  }
  let best:any=null; const X=pool[gi];
  for(const [s,c] of cand){
    const nb=body.split(s).join(X), nt=tape+X+s;
    const tot=T(nt)+T(nb);                       // WIRE ONLY - fixed cost subsidized
    if(tot<wireTok && (!best||tot<best.tot)) best={s,tot,nb,nt};
  }
  if(!best) break;
  body=best.nb; tape=best.nt; wireTok=best.tot; gi++;
}
const bootMsg = CONTRACT+2+T(tape)+T(body);
const bootWins = bootMsg < base.messageTokens;
console.log(f.split('/').pop()!.padEnd(14),'raw',String(base.inTokens).padStart(4),
 '| synkope',String(base.messageTokens).padStart(4),'(rules',String(base.rules).padStart(2),')',
 '| bootstrapped',String(bootMsg).padStart(4),'(rules',String(gi).padStart(2),')',
 '| vs synkope',String(bootMsg-base.messageTokens).padStart(5), bootWins?'WIN':'');
