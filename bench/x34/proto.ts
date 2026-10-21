import fs from 'node:fs';
import { oikonomiaEncode, oikonomiaRoundTrip } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const HEX='0123456789abcdef';
const A='etaoinsrhldcumfp';
const RUNRE=/[0-9a-fA-F]{4,}(?:[-_][0-9a-fA-F]{2,})*|[0-9a-fA-F]{12,}/g;
const MINL=Number(process.env.MINL||16);
const MARK='~';
const m16=new Map<string,string>(); for(let i=0;i<16;i++) m16.set(HEX[i],A[i]);
const conv=(s:string)=>{let o='';for(const c of s)o+=m16.get(c)??c;return o;};
// inverse
const back=new Map<string,string>(); for(const [k,v] of m16) back.set(v,k);
function undo(t:string){
  let out=''; let i=0;
  while(i<t.length){
    const c=t[i];
    if(c===MARK){ let j=i+1,s=''; while(j<t.length && back.has(t[j])) s+=t[j++];
      out+=s.split('').map(x=>back.get(x)!).join(''); i=j; continue; }
    out+=c; i++;
  }
  return out;
}
function transform(t:string){
  // safety: marker must not occur; every run must be followed by a non-alphabet char
  if(t.includes(MARK)) return null;
  const runs:{s:number,e:number}[]=[];
  for(const m of t.matchAll(RUNRE)){ if(m[0].length>=MINL) runs.push({s:m.index!,e:m.index!+m[0].length}); }
  if(!runs.length) return null;
  for(const r of runs){ const nx=t[r.e]; if(nx!==undefined && back.has(nx)) return null; }
  let out='',prev=0;
  for(const r of runs){ out+=t.slice(prev,r.s)+MARK+conv(t.slice(r.s,r.e).toLowerCase()); prev=r.e; }
  out+=t.slice(prev);
  return out;
}
const clause=`${MARK} starts a hex run: letters ${A} mean ${HEX}; drop the ${MARK}`;
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f)) continue;
  const t=fs.readFileSync(f,'utf8');
  const baseR:any=oikonomiaEncode(t,enc); const base=baseR.messageTokens;
  const ok0=oikonomiaRoundTrip(t,enc);
  const t2=transform(t);
  if(t2===null){ console.log(f.split('/').pop()!.padEnd(26),'raw',String(countTokens(t,enc)).padStart(5),'oiko',String(base).padStart(5),'  (no transform)'); continue; }
  // sanity: undo(transform) === original on the raw text
  const rt=undo(t2)===t;
  const r2:any=oikonomiaEncode(t2,enc);
  const msg=r2.messageTokens+countTokens('. '+clause,enc)-countTokens('.',enc);
  // full pipeline check: decode wire -> t2 -> undo -> t
  const decoded = oikonomiaRoundTrip(t2,enc);
  console.log(f.split('/').pop()!.padEnd(26),'raw',String(countTokens(t,enc)).padStart(5),
    'oiko',String(base).padStart(5),'pyk',String(msg).padStart(5),
    'DELTA',String(msg-base).padStart(5),'inv',rt,'rt',decoded,'baseRt',ok0);
}
