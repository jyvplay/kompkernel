/** How much headroom is in the arms' UNSWEPT parameter space? */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { CHIRON_START, chironDecode, chironSeparators } from '../src/lib/omega/chiron';
import { syntomiaContract } from '../src/lib/omega/syntomia';
import { sibylEncode } from '../src/lib/omega/sibyl';
import { metatronEncode } from '../src/lib/omega/metatron';
import { logistikeEncode } from '../src/lib/omega/logistike';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const cost=(r:any,t:string)=>{ if(!r||r.decoded!==t) return 1e9; let v=typeof r.messageTokens==='number'?r.messageTokens:1e9;
  if(typeof r.wire==='string'&&r.wire.startsWith(CHIRON_START)){try{if(chironDecode(r.wire)===t) v=Math.min(v,T(r.wire)+T(syntomiaContract(r.wire,t)));}catch{}} return v;};
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout','bench/holdout-work','bench/holdout-lang','bench/holdout-tbl','bench/holdout-mk'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>200&&t.length<9000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
console.log('dimension probes, each vs the LOGISTIKE baseline');
console.log('lane'.padEnd(24),'LOG'.padStart(5),'cap'.padStart(5),'lvl'.padStart(5),'topK'.padStart(5),'sep'.padStart(5),'best'.padStart(5),'Δ'.padStart(4),'which');
let L=0,B=0; const dimWin:Record<string,number>={cap:0,lvl:0,topK:0,sep:0};
for(const [n,t] of files){
  let inc:any; try{const r=metatronEncode(t,ENC,{budgetMs:1200}); if(r.decoded===t) inc=r;}catch{}
  const lg=logistikeEncode(t,ENC,{maxArms:4,armBudgetMs:60,incumbent:inc});
  const base=Math.min(T(t),lg.messageTokens);
  const probe=(opts:any)=>{try{return cost(sibylEncode(t,ENC,{budgetMs:60,...opts} as any),t);}catch{return 1e9;}};
  let cap=1e9; for(const c of [[4],[8],[16],[32],[64]]) cap=Math.min(cap,probe({wordGrid:[6],capGrid:c}));
  let lvl=1e9; for(const l of [1,2,3,4,8,10]) lvl=Math.min(lvl,probe({wordGrid:[6],levels:l}));
  let tk=1e9;  for(const k of [256,1024,4096,16000]) tk=Math.min(tk,probe({wordGrid:[6],topK:k}));
  let sp=1e9;  for(const s of chironSeparators(t).filter(x=>x!=='\n')) sp=Math.min(sp,probe({wordGrid:[6],sep:s}));
  const vals={cap,lvl,topK:tk,sep:sp};
  const best=Math.min(base,cap,lvl,tk,sp);
  let which='-'; for(const [k,v] of Object.entries(vals)) if(v===best&&best<base){which=k;dimWin[k]+=base-best;break;}
  L+=base;B+=best;
  if(best<base) console.log(n.padEnd(24),String(base).padStart(5),String(Math.min(cap,99999)).padStart(5),String(Math.min(lvl,99999)).padStart(5),
    String(Math.min(tk,99999)).padStart(5),String(Math.min(sp,99999)).padStart(5),String(best).padStart(5),String(base-best).padStart(4),which);
}
console.log('TOTAL'.padEnd(24),String(L).padStart(5),''.padStart(5),''.padStart(5),''.padStart(5),''.padStart(5),String(B).padStart(5),String(L-B).padStart(4));
console.log(`unswept parameter space headroom over LOGISTIKE: ${L-B} tokens (${((L-B)/L*100).toFixed(2)}%)`);
console.log('attribution:', JSON.stringify(dimWin));
