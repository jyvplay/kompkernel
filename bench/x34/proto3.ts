import fs from 'node:fs';
import { oikonomiaEncode, oikonomiaRoundTrip } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const HEX='0123456789abcdef';
const A=process.env.ALPHA||'etaoinsrkldcumyp';
const MARK=process.env.MARK||'~';
const MINL=Number(process.env.MINL||8);
const m16=new Map<string,string>(); for(let i=0;i<16;i++) m16.set(HEX[i],A[i]);
const back=new Map<string,string>(); for(const [k,v] of m16) back.set(v,k);
const KEEP=new Set(['-','_']);
const conv=(s:string)=>{let o='';for(const c of s)o+=m16.get(c)??c;return o;};
function undo(t:string){ let out='',i=0;
  while(i<t.length){ if(t[i]===MARK){ let j=i+1,s='';
      while(j<t.length&&(back.has(t[j])||KEEP.has(t[j])))s+=t[j++];
      out+=s.split('').map(x=>back.get(x)??x).join(''); i=j; continue; } out+=t[i++]; }
  return out; }
const RUNRE=/[0-9a-f]{4,}(?:[-_][0-9a-f]{2,})*|[0-9a-f]{8,}/g;
const clause=`${MARK} starts a hex run: letters ${A} mean ${HEX}; drop the ${MARK}`;
const clauseTok=countTokens(' '+clause,enc)-countTokens(' ',enc);
// per-run accept/reject measured INCLUDING marker
function pick(t:string){
  if(t.includes(MARK)) return null;
  const cand:{s:number,e:number}[]=[];
  for(const m of t.matchAll(RUNRE)){
    if(m[0].length<MINL) continue;
    const b=t[m.index!-1], a=t[m.index!+m[0].length];
    if(b&&/[0-9a-f]/.test(b)) continue;
    if(a&&/[0-9a-f]/.test(a)) continue;
    cand.push({s:m.index!,e:m.index!+m[0].length});
  }
  const keep:{s:number,e:number}[]=[];
  for(const r of cand){
    const nx=t[r.e];
    if(nx!==undefined && (back.has(nx))) continue;      // soundness: must be delimited
    const before=countTokens(t.slice(r.s,r.e),enc);
    const after =countTokens(MARK+conv(t.slice(r.s,r.e)),enc);
    if(after<before) keep.push(r);
  }
  if(!keep.length) return null;
  let out='',prev=0;
  for(const r of keep){ out+=t.slice(prev,r.s)+MARK+conv(t.slice(r.s,r.e)); prev=r.e; }
  out+=t.slice(prev);
  return out;
}
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f)) continue;
  const t=fs.readFileSync(f,'utf8');
  const baseR:any=oikonomiaEncode(t,enc); const base=baseR.messageTokens;
  const t2=pick(t);
  if(t2===null){ console.log(f.split('/').pop()!.padEnd(26),'oiko',String(base).padStart(5),'  (no paying runs)'); continue; }
  const inv=undo(t2)===t;
  const r2:any=oikonomiaEncode(t2,enc);
  const msg=r2.messageTokens+clauseTok;
  console.log(f.split('/').pop()!.padEnd(26),'oiko',String(base).padStart(5),'pyk',String(msg).padStart(5),
    'DELTA',String(msg-base).padStart(5),'clause',clauseTok,'INV',inv,'RT',oikonomiaRoundTrip(t2,enc));
}
