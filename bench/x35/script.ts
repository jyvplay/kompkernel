import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_SCRIPTS, CHIRON_START, CHIRON_SEP, chironParseTape, chironInScript } from '@/lib/omega/chiron';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
const enc='o200k_base' as any;
const poolCache=new Map<string,string[]>();
function poolOf(name:string, payload:Set<string>){
  const k=name+':'+payload.size;
  if(poolCache.has(k)) return poolCache.get(k)!;
  const sc=CHIRON_SCRIPTS.find(s=>s.name===name)!;
  const spans=sc.ranges??[[sc.lo,sc.hi]] as Array<[number,number]>;
  const out:string[]=[];
  for(const [a,b] of spans){ for(let cp=a;cp<b;cp++){ const ch=String.fromCodePoint(cp);
    if(!payload.has(ch) && countTokens(ch,enc)===1) out.push(ch); } }
  poolCache.set(k,out); return out;
}
function scriptOf(ch:string){ const cp=ch.codePointAt(0); if(cp===undefined)return null;
  for(const s of CHIRON_SCRIPTS) if((chironInScript as any)(s,cp)) return s; return null; }
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const r:any=oikonomiaEncode(t,enc);
  const w:String=r.wire; const cut=w.indexOf(CHIRON_SEP);
  if(cut<0){ console.log(f.split('/').pop()!.padEnd(26),'no rules'); continue; }
  const gloss=w.slice(CHIRON_START.length,cut); const body=w.slice(cut+1);
  const sc0=scriptOf(gloss[0]||''); if(!sc0){ console.log(f.split('/').pop()!.padEnd(26),'no script'); continue; }
  const rules=chironParseTape(gloss,sc0) as any[];
  if(!rules||!rules.length){ console.log(f.split('/').pop()!.padEnd(26),'no rules parsed'); continue; }
  const orig=rules.map(x=>x.glyph);
  const payload=new Set(t);
  const base=countTokens(String(w),enc);
  const res:string[]=[];
  for(const s of CHIRON_SCRIPTS){
    const pool=poolOf(s.name,payload);
    if(pool.length<orig.length){ res.push(`${s.name}:pool${pool.length}`); continue; }
    // identity-order relabel into this script's pool
    const map=new Map<string,string>(); for(let i=0;i<orig.length;i++) map.set(orig[i],pool[i]);
    const conv=(x:string)=>{let o='';for(const c of x)o+=map.get(c)??c;return o;};
    let nt=''; for(let i=0;i<rules.length;i++) nt+=pool[i]+conv(rules[i].raw);
    const nw=CHIRON_START+nt+CHIRON_SEP+conv(String(body));
    res.push(`${s.name}:${countTokens(nw,enc)}`);
  }
  console.log(f.split('/').pop()!.padEnd(26),'rules',String(orig.length).padStart(3),
    'script=',sc0.name,'base',base,'|',res.join('  '));
}
