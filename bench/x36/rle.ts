import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const T=(s:string)=>countTokens(s,enc);
// measure: repeated ADJACENT delimited fields (run-length at field level)
function scan(f:string){
  const t=fs.readFileSync(f,'utf8');
  const out:string[]=[];
  for(const sep of [',','\t','|',';']){
    const lines=t.split('\n');
    let runs=0,extraChars=0,fields=0;
    for(const ln of lines){
      if(!ln.includes(sep)) continue;
      const fs2=ln.split(sep); fields+=fs2.length;
      let i=0;
      while(i<fs2.length){
        let j=i; while(j+1<fs2.length && fs2[j+1]===fs2[i]) j++;
        const k=j-i+1;
        if(k>=2 && fs2[i].length>0){ runs++; extraChars+=(k-1)*(fs2[i].length+1); }
        i=j+1;
      }
    }
    if(runs>0) out.push(`${JSON.stringify(sep)}:runs${runs}/ch${extraChars}/tok~${T('x'.repeat(Math.min(extraChars,4000)))}`);
  }
  // trailing-zero / fixed precision: values like 17.240000 with constant decimal width
  const dec=new Map<number,number>();
  for(const m of t.matchAll(/\d+\.(\d+)/g)) { const w=m[1].length; dec.set(w,(dec.get(w)||0)+1); }
  const dw=[...dec.entries()].sort((a,b)=>b[1]-a[1])[0];
  let zeroChars=0;
  if(dw){ for(const m of t.matchAll(/\d+\.(\d+)/g)){ if(m[1].length===dw[0]){ const s=m[1].replace(/0+$/,''); zeroChars+=dw[0]-s.length; } } }
  console.log(f.split('/').pop()!.padEnd(26),
    out.length?out.join('  '):'no repeated adjacent fields',
    '| decW',dw?`${dw[0]}x${dw[1]}` :'-', 'trailingZeroCh',String(zeroChars).padStart(5));
}
for(const f of (process.env.LANES||'').split(',').filter(Boolean)) if(fs.existsSync(f)) scan(f);
