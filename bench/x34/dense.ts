import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
// find all "low density" substrings: greedy scan, extend while chars/token is poor
function badRegions(t:string,thresh:number,minLen:number){
  const out:{s:number,e:number,cpt:number}[]=[];
  let i=0;
  while(i<t.length){
    // try to grow a run of "bad" chars
    let j=i;
    while(j<t.length && /[0-9a-zA-Z+\/=_-]/.test(t[j])) j++;
    const len=j-i;
    if(len>=minLen){
      const sub=t.slice(i,j);
      const cpt=sub.length/Math.max(1,countTokens(sub,enc));
      if(cpt<thresh) out.push({s:i,e:j,cpt:+cpt.toFixed(2)});
    }
    i=Math.max(j,i+1);
  }
  return out;
}
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f)) continue;
  const t=fs.readFileSync(f,'utf8');
  const regs=badRegions(t,3.0,10);
  const ch=regs.reduce((a,r)=>a+(r.e-r.s),0);
  const tok=regs.reduce((a,r)=>a+countTokens(t.slice(r.s,r.e),enc),0);
  // character-class census of those regions
  const census=new Map<string,number>();
  for(const r of regs) for(const c of t.slice(r.s,r.e)){
    const k=/[0-9]/.test(c)?'digit':/[a-f]/.test(c)?'a-f':/[A-F]/.test(c)?'A-F':/[g-z]/.test(c)?'g-z':/[G-Z]/.test(c)?'G-Z':/[+\/=]/.test(c)?'b64sym':'other';
    census.set(k,(census.get(k)||0)+1);
  }
  const top=[...census.entries()].sort((a,b)=>b[1]-a[1]);
  console.log(f.split('/').pop()!.padEnd(26),'regions',String(regs.length).padStart(4),
    'ch',String(ch).padStart(6),'tok',String(tok).padStart(5),'cpt',(ch/Math.max(1,tok)).toFixed(2),
    '|',top.map(([k,v])=>k+':'+v).join(' '));
}
