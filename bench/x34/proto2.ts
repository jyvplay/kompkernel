import fs from 'node:fs';
import { oikonomiaEncode, oikonomiaRoundTrip } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const HEX='0123456789abcdef';
const A='etaoinsrhldcumfp';
const MINL=Number(process.env.MINL||16);
const MARK=process.env.MARK||'~';
const m16=new Map<string,string>(); for(let i=0;i<16;i++) m16.set(HEX[i],A[i]);
const back=new Map<string,string>(); for(const [k,v] of m16) back.set(v,k);
const conv=(s:string)=>{let o='';for(const c of s)o+=m16.get(c)??c;return o;};
const KEEP=new Set(['-','_']);
function undo(t:string){
  let out='',i=0;
  while(i<t.length){ if(t[i]===MARK){ let j=i+1,s='';
      while(j<t.length&&(back.has(t[j])||KEEP.has(t[j])))s+=t[j++];
      out+=s.split('').map(x=>back.get(x)??x).join(''); i=j; continue; } out+=t[i++]; }
  return out;
}
// lowercase-hex-only runs, maximal
const RUNRE=/[0-9a-f]{4,}(?:[-_][0-9a-f]{2,})*|[0-9a-f]{12,}/g;
function transform(t:string){
  if(t.includes(MARK)) return {t:null,why:'marker in source'};
  const runs:{s:number,e:number}[]=[];
  for(const m of t.matchAll(RUNRE)){
    if(m[0].length<MINL) continue;
    // reject if preceded/followed by a lowercase-hex char (not maximal)
    const before=t[m.index!-1], after=t[m.index!+m[0].length];
    if(before&&/[0-9a-f]/.test(before)) continue;
    if(after&&/[0-9a-f]/.test(after)) continue;
    runs.push({s:m.index!,e:m.index!+m[0].length});
  }
  if(!runs.length) return {t:null,why:'no runs'};
  for(const r of runs){ const nx=t[r.e]; if(nx!==undefined&&back.has(nx)) return {t:null,why:'run followed by alphabet char '+JSON.stringify(nx)}; }
  let out='',prev=0;
  for(const r of runs){ out+=t.slice(prev,r.s)+MARK+conv(t.slice(r.s,r.e)); prev=r.e; }
  out+=t.slice(prev);
  return {t:out,why:'',n:runs.length};
}
const clause=`${MARK} starts a hex run: letters ${A} mean ${HEX}; drop the ${MARK}`;
const clauseTok=countTokens(' '+clause,enc)-countTokens(' ',enc);
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f)) continue;
  const t=fs.readFileSync(f,'utf8');
  const baseR:any=oikonomiaEncode(t,enc); const base=baseR.messageTokens;
  const tr=transform(t);
  if(tr.t===null){ console.log(f.split('/').pop()!.padEnd(26),'oiko',String(base).padStart(5),'  (skip: '+tr.why+')'); continue; }
  const inv=undo(tr.t)===t;
  const r2:any=oikonomiaEncode(tr.t,enc);
  const msg=r2.messageTokens+clauseTok;
  const rt=oikonomiaRoundTrip(tr.t,enc);
  console.log(f.split('/').pop()!.padEnd(26),'oiko',String(base).padStart(5),'pyk',String(msg).padStart(5),
    'DELTA',String(msg-base).padStart(5),'runs',String(tr.n).padStart(4),'clause',clauseTok,'INV',inv,'RT',rt);
}
