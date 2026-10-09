/** RECORD-PERIODIC transpose: group line p of every P-line record together. */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { CHIRON_START, chironDecode } from '../src/lib/omega/chiron';
import { syntomiaContract } from '../src/lib/omega/syntomia';
import { sibylEncode } from '../src/lib/omega/sibyl';
import { epistemeEncode } from '../src/lib/omega/episteme';
import { metatronEncode } from '../src/lib/omega/metatron';
import { plinthosEncode } from '../src/lib/omega/plinthos';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const best=(t:string)=>{let b=T(t);
  for(const fn of [()=>sibylEncode(t,ENC,{budgetMs:60,wordGrid:[6]} as any),
                   ()=>sibylEncode(t,ENC,{budgetMs:60,wordGrid:[12]} as any),
                   ()=>sibylEncode(t,ENC,{budgetMs:60,wordGrid:[6],capGrid:[16]} as any),
                   ()=>epistemeEncode(t,ENC,{budgetMs:60} as any)]){
    try{const r=fn(); if(r&&r.decoded===t&&typeof r.wire==='string'&&r.wire.startsWith(CHIRON_START)&&chironDecode(r.wire)===t)
      b=Math.min(b,T(r.wire)+T(syntomiaContract(r.wire,t)));}catch{} }
  return b;};
/** interleave lines[a..b) with period P -> P groups of R */
function stride(lines:string[],a:number,b:number,P:number){
  const R=(b-a)/P; if(!Number.isInteger(R)||R<2) return null;
  const out:string[]=[];
  for(let p=0;p<P;p++) for(let r=0;r<R;r++) out.push(lines[a+r*P+p]);
  return out;
}
function unstride(g:string[],P:number){
  const R=g.length/P; if(!Number.isInteger(R)) return null;
  const out:string[]=[];
  for(let r=0;r<R;r++) for(let p=0;p<P;p++) out.push(g[p*R+r]);
  return out;
}
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout','bench/holdout-ops','bench/holdout-mk','bench/holdout-work','bench/holdout-tbl','bench/holdout-tab'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>400&&t.length<20000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
console.log('lane'.padEnd(26),'raw'.padStart(6),'MTR'.padStart(6),'PLI'.padStart(6),'P'.padStart(3),'rawS'.padStart(6),'bestS'.padStart(6),'Δ'.padStart(5));
let B=0,S=0;
for(const [n,t] of files){
  const raw=T(t); let inc:any;
  try{const r=metatronEncode(t,ENC,{budgetMs:900}); if(r.decoded===t) inc=r;}catch{}
  const m=inc?Math.min(raw,inc.messageTokens):raw;
  const pl=plinthosEncode(t,ENC,{maxConfigs:2,configBudgetMs:45,incumbent:inc});
  const pv=Math.min(raw,pl.messageTokens);
  const hadTrail=t.endsWith('\n'); const lines=(hadTrail?t.slice(0,-1):t).split('\n');
  let bp=0,bt=pv,brs=0;
  // search period P and an aligned window [a,b)
  for(let P=2;P<=40;P++){
    if(lines.length<3*P) break;
    for(const a of [0,1,2,3]){
      const span=Math.floor((lines.length-a)/P)*P; if(span<3*P) continue;
      const b2=a+span;
      const g=stride(lines,a,b2,P); if(!g) continue;
      const u=unstride(g,P); if(!u||u.join('\n')!==lines.slice(a,b2).join('\n')) continue;
      const out=[...lines.slice(0,a),'◈'+P,...g,'◇',...lines.slice(b2)].join('\n')+(hadTrail?'\n':'');
      const rs=T(out); if(rs>=bt+20) continue;
      const c=best(out)+14;
      if(c<bt){bt=c;bp=P;brs=rs;}
    }
  }
  B+=pv;S+=Math.min(pv,bt);
  if(bt<pv) console.log(n.padEnd(26),String(raw).padStart(6),String(m).padStart(6),String(pv).padStart(6),String(bp).padStart(3),String(brs).padStart(6),String(bt).padStart(6),String(pv-bt).padStart(5));
}
console.log('TOTAL'.padEnd(26),''.padStart(6),''.padStart(6),String(B).padStart(6),''.padStart(3),''.padStart(6),String(S).padStart(6),String(B-S).padStart(5));
console.log(`record-periodic transpose on top of PLINTHOS: ${B-S} tokens (${((B-S)/B*100).toFixed(2)}%)`);
