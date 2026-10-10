import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { sibylEncode } from '../src/lib/omega/sibyl';
import { syntomiaContract } from '../src/lib/omega/syntomia';
import { CHIRON_START, chironDecode } from '../src/lib/omega/chiron';
import { metatronEncode } from '../src/lib/omega/metatron';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
function cost(r:any,t:string){ if(!r||r.decoded!==t) return 1e9; let v=typeof r.messageTokens==='number'?r.messageTokens:1e9;
  if(typeof r.wire==='string'&&r.wire.startsWith(CHIRON_START)){ try{ if(chironDecode(r.wire)===t) v=Math.min(v,T(r.wire)+T(syntomiaContract(r.wire,t))); }catch{} } return v; }
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length<20000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
const WIDE=[0,1,2,3,4,6,8,12,16,24,32,48];
console.log('lane'.padEnd(26),'raw'.padStart(5),'MTR'.padStart(5),'sep4'.padStart(6),'ms'.padStart(6),'wide12'.padStart(7),'ms'.padStart(6),'D'.padStart(5));
let R=0,M=0,S=0,W=0,msS=0,msW=0;
for(const [n,t] of files){
  const raw=T(t);
  let m=raw; try{const r=metatronEncode(t,ENC,{budgetMs:2000}); if(r.decoded===t) m=Math.min(raw,r.messageTokens);}catch{}
  let t0=Date.now(); let sep=raw;
  for(const w of [1,3,6,12]){ try{ sep=Math.min(sep,cost(sibylEncode(t,ENC,{budgetMs:80,wordGrid:[w]} as any),t)); }catch{} }
  const a=Date.now()-t0;
  t0=Date.now(); let wide=raw;
  try{ wide=Math.min(wide,cost(sibylEncode(t,ENC,{budgetMs:80,wordGrid:WIDE} as any),t)); }catch{}
  const b=Date.now()-t0;
  R+=raw;M+=m;S+=Math.min(m,sep);W+=Math.min(m,wide);msS+=a;msW+=b;
  console.log(n.padEnd(26),String(raw).padStart(5),String(m).padStart(5),String(Math.min(sep,raw)).padStart(6),String(a).padStart(6),String(Math.min(wide,raw)).padStart(7),String(b).padStart(6),String(Math.min(m,sep)-Math.min(m,wide)).padStart(5));
}
console.log('TOTAL'.padEnd(26),String(R).padStart(5),String(M).padStart(5),String(S).padStart(6),String(msS).padStart(6),String(W).padStart(7),String(msW).padStart(6),String(S-W).padStart(5));
console.log(`4 separate arms: ${S} in ${msS}ms   |   1 wide grid: ${W} in ${msW}ms   |   speedup ${(msS/msW).toFixed(2)}x, tokens ${S-W>=0?'-':'+'}${Math.abs(S-W)}`);
console.log(`vs METATRON: sep4 ${M-S} (${((M-S)/M*100).toFixed(2)}%)  wide12 ${M-W} (${((M-W)/M*100).toFixed(2)}%)`);
