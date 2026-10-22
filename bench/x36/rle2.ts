import fs from 'node:fs';
import { syncopeEncode } from '@/lib/omega/syncope';
import { countTokens } from '@/lib/omega/bpe';
const ENC='o200k_base' as any;
const MARK='\u21e4';   // "the preceding field, repeated N times"

function collapse(text:string,sep:string):string|null{
  if(text.includes(MARK)) return null;
  let changed=false;
  const out=text.split('\n').map(ln=>{
    const cr=ln.endsWith('\r'); const core=cr?ln.slice(0,-1):ln;
    if(!core.includes(sep)) return ln;
    const f=core.split(sep); const o:string[]=[];
    let i=0;
    while(i<f.length){
      let j=i; while(j+1<f.length && f[j+1]===f[i]) j++;
      const k=j-i+1;
      if(k>=2 && f[i].length>0){ o.push(f[i]+MARK+k); changed=true; }
      else for(let q=i;q<=j;q++) o.push(f[q]);
      i=j+1;
    }
    return o.join(sep)+(cr?'\r':'');
  }).join('\n');
  return changed?out:null;
}
function expand(text:string,sep:string):string{
  return text.split('\n').map(ln=>{
    if(!ln.includes(MARK)) return ln;
    const cr=ln.endsWith('\r'); const core=cr?ln.slice(0,-1):ln;
    const o=core.split(sep).flatMap(p=>{
      const i=p.indexOf(MARK);
      if(i>0 && /^\d+$/.test(p.slice(i+1))){ const n=parseInt(p.slice(i+1),10);
        return new Array(n).fill(p.slice(0,i)); }
      return [p];
    });
    return o.join(sep)+(cr?'\r':'');
  }).join('\n');
}
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const text=fs.readFileSync(f,'utf8');
  const base:any=syncopeEncode(text,ENC);
  let bestN=0,bestSep='';
  for(const sep of [',','\t','|',';']){
    const e=collapse(text,sep); if(e===null) continue;
    if(expand(e,sep)!==text){ console.log(f.split('/').pop(),'ROUNDTRIP FAIL',JSON.stringify(sep)); continue; }
    const r:any=syncopeEncode(e,ENC);
    if(bestN===0||r.messageTokens<bestN){ bestN=r.messageTokens; bestSep=sep; }
  }
  if(!bestN){ console.log(f.split('/').pop()!.padEnd(26),'no adjacent-field repetition'); continue; }
  console.log(f.split('/').pop()!.padEnd(26),'base',String(base.messageTokens).padStart(5),
    '-> RLE',String(bestN).padStart(5),'=>',String(bestN-base.messageTokens).padStart(5),
    `(${((bestN-base.messageTokens)/base.messageTokens*100).toFixed(1)}%) sep=${JSON.stringify(bestSep)}`);
}
