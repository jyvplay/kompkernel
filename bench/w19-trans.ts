/** Does COLUMN-MAJOR reordering help the compressor on tabular lanes? */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { CHIRON_START, chironDecode } from '../src/lib/omega/chiron';
import { syntomiaContract } from '../src/lib/omega/syntomia';
import { sibylEncode } from '../src/lib/omega/sibyl';
import { epistemeEncode } from '../src/lib/omega/episteme';
import { metatronEncode } from '../src/lib/omega/metatron';
import { polytroposEncode } from '../src/lib/omega/polytropos';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const best=(t:string)=>{let b=T(t);
  for(const fn of [()=>sibylEncode(t,ENC,{budgetMs:70,wordGrid:[6]} as any),
                   ()=>sibylEncode(t,ENC,{budgetMs:70,wordGrid:[12]} as any),
                   ()=>sibylEncode(t,ENC,{budgetMs:70,wordGrid:[6],capGrid:[16]} as any),
                   ()=>epistemeEncode(t,ENC,{budgetMs:70} as any)]){
    try{const r=fn(); if(r&&r.decoded===t&&typeof r.wire==='string'&&r.wire.startsWith(CHIRON_START)&&chironDecode(r.wire)===t)
      b=Math.min(b,T(r.wire)+T(syntomiaContract(r.wire,t)));}catch{} }
  return b;};
/** split lines on `sep`; if every line has the same field count, transpose */
function transpose(t:string,sep:string){
  const hadTrail=t.endsWith('\n');
  const lines=t.replace(/\n$/,'').split('\n');
  if(lines.length<4) return null;
  const rows=lines.map(l=>l.split(sep));
  const w=rows[0].length; if(w<2||w>24) return null;
  if(!rows.every(r=>r.length===w)) return null;
  const cols:string[]=[];
  for(let c=0;c<w;c++) cols.push(rows.map(r=>r[c]).join(sep));
  const out=cols.join('\n')+(hadTrail?'\n':'');
  // inverse must reproduce exactly
  const back=(()=>{const cl=out.replace(/\n$/,'').split('\n'); if(cl.length!==w) return null;
    const cc=cl.map(l=>l.split(sep)); const h=cc[0].length;
    if(!cc.every(x=>x.length===h)) return null;
    const rr:string[]=[]; for(let i=0;i<h;i++) rr.push(cc.map(x=>x[i]).join(sep));
    return rr.join('\n')+(hadTrail?'\n':'');})();
  if(back!==t) return null;
  return out;
}
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout-tab','bench/holdout-tbl','bench/holdout-ops','bench/holdout-work','bench/holdout','bench/holdout-mk'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>400&&t.length<20000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
console.log('lane'.padEnd(26),'raw'.padStart(6),'MTR'.padStart(6),'POLY'.padStart(6),'rawT'.padStart(6),'bestT'.padStart(6),'Δ'.padStart(5),'sep');
let P=0,B=0;
for(const [n,t] of files){
  const raw=T(t); let inc:any;
  try{const r=metatronEncode(t,ENC,{budgetMs:1200}); if(r.decoded===t) inc=r;}catch{}
  const m=inc?Math.min(raw,inc.messageTokens):raw;
  const pt=polytroposEncode(t,ENC,{maxConfigs:4,configBudgetMs:60,incumbent:inc});
  const pv=Math.min(raw,pt.messageTokens);
  let bt=pv,bs='-',rt=0;
  for(const sep of [',','\t','|',';',' ']){
    const tr=transpose(t,sep); if(!tr) continue;
    const c=best(tr)+6;   // +6 tokens: a transpose clause in the contract
    if(c<bt){bt=c;bs=JSON.stringify(sep);rt=T(tr);}
  }
  P+=pv;B+=Math.min(pv,bt);
  if(bt<pv) console.log(n.padEnd(26),String(raw).padStart(6),String(m).padStart(6),String(pv).padStart(6),String(rt).padStart(6),String(bt).padStart(6),String(pv-bt).padStart(5),bs);
}
console.log('TOTAL'.padEnd(26),''.padStart(6),''.padStart(6),String(P).padStart(6),''.padStart(6),String(B).padStart(6),String(P-B).padStart(5));
console.log(`column-major on top of POLYTROPOS: ${P-B} tokens (${((P-B)/P*100).toFixed(2)}%)`);
