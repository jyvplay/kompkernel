import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode, chironSeparators } from '../src/lib/omega/chiron';
import { syntomiaContract } from '../src/lib/omega/syntomia';
import { sibylEncode } from '../src/lib/omega/sibyl';
import { ariadneEncode } from '../src/lib/omega/ariadne';
import { epistemeEncode } from '../src/lib/omega/episteme';
import { metatronEncode } from '../src/lib/omega/metatron';
import { logistikeEncode } from '../src/lib/omega/logistike';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const cost=(r:any,t:string)=>{ if(!r||r.decoded!==t) return 1e9; let v=typeof r.messageTokens==='number'?r.messageTokens:1e9;
  if(typeof r.wire==='string'&&r.wire.startsWith(CHIRON_START)){try{if(chironDecode(r.wire)===t) v=Math.min(v,T(r.wire)+T(syntomiaContract(r.wire,t)));}catch{}} return v;};
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout','bench/holdout-work','bench/holdout-lang','bench/holdout-tbl','bench/holdout-mk','bench/holdout-ops','bench/holdout-tab'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>200&&t.length<24000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
console.log('lane'.padEnd(26),'raw'.padStart(6),'MTR'.padStart(6),'LOG'.padStart(6),'LOG+sep'.padStart(8),'Δ'.padStart(5),'sep','ms');
let R=0,M=0,L=0,S=0;
for(const [n,t] of files){
  const raw=T(t); let m=raw, inc:any;
  try{const r=metatronEncode(t,ENC,{budgetMs:2500}); if(r.decoded===t){m=Math.min(raw,r.messageTokens);inc=r;}}catch{}
  const lg=logistikeEncode(t,ENC,{maxArms:4,armBudgetMs:80,incumbent:inc});
  const lgT=Math.min(raw,lg.messageTokens);
  // non-default separators only: the default ('\n') is already what the arms use
  const seps=chironSeparators(t).filter(s=>s!=='\n');
  let best=lgT,bs='-'; const t0=Date.now();
  for(const s of seps){
    for(const fn of [()=>sibylEncode(t,ENC,{budgetMs:80,wordGrid:[6],sep:s} as any),
                     ()=>sibylEncode(t,ENC,{budgetMs:80,wordGrid:[12],sep:s} as any),
                     ()=>ariadneEncode(t,ENC,{budgetMs:80,sep:s} as any),
                     ()=>epistemeEncode(t,ENC,{budgetMs:80,sep:s} as any)]){
      try{const c=cost(fn(),t); if(c<best){best=c;bs=JSON.stringify(s);}}catch{}
    }
  }
  const ms=Date.now()-t0;
  R+=raw;M+=m;L+=lgT;S+=best;
  if(best<lgT) console.log(n.padEnd(26),String(raw).padStart(6),String(m).padStart(6),String(lgT).padStart(6),String(best).padStart(8),String(lgT-best).padStart(5),bs,ms+'ms');
}
console.log('TOTAL'.padEnd(26),String(R).padStart(6),String(M).padStart(6),String(L).padStart(6),String(S).padStart(8),String(L-S).padStart(5));
console.log(`sep-sweep on top of LOGISTIKE: ${L-S} tokens (${((L-S)/L*100).toFixed(2)}%); combined vs METATRON ${M-S} (${((M-S)/M*100).toFixed(2)}%)`);
