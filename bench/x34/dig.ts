import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const D='0123456789';
const cands:Record<string,string>={
  freq10 : 'etaoinsrhl',
  freq10b: 'etaoinshrd',
  vowely : 'aeioubcdfg',
  conson : 'bcdfghjklm',
  the     : 'theranisod',
};
function runs(t:string,minL:number){ const out:{s:number,e:number}[]=[];
  for(const m of t.matchAll(/[0-9]{2,}/g)){ if(m[0].length>=minL) out.push({s:m.index!,e:m.index!+m[0].length}); } return out; }
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f)) continue;
  const t=fs.readFileSync(f,'utf8');
  const R=runs(t,4);
  if(!R.length){ console.log(f.split('/').pop()!.padEnd(26),'no digit runs'); continue; }
  let ch=0, base=0; const per:Record<string,number>={};
  for(const k of Object.keys(cands)) per[k]=0;
  for(const r of R){
    const s=t.slice(r.s,r.e); ch+=s.length; base+=countTokens(s,enc);
    for(const k of Object.keys(cands)){ const A=cands[k];
      let o=''; for(const c of s) o+=A[+c];
      per[k]+=countTokens(o,enc); }
  }
  console.log(f.split('/').pop()!.padEnd(26),'runs',String(R.length).padStart(4),'ch',String(ch).padStart(6),
    'baseTok',String(base).padStart(5),'cpt',(ch/base).toFixed(2),'|',
    Object.keys(cands).map(k=>`${k}:${per[k]}(${(per[k]-base>=0?'+':'')}${per[k]-base})`).join(' '));
}
