/** Is the GLYPH SCRIPT an unswept dimension?  scriptTries defaults to 2 of 8. */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { CHIRON_START, chironDecode, CHIRON_SCRIPTS } from '../src/lib/omega/chiron';
import { syntomiaContract } from '../src/lib/omega/syntomia';
import { sibylEncode } from '../src/lib/omega/sibyl';
import { epistemeEncode } from '../src/lib/omega/episteme';
import { metatronEncode } from '../src/lib/omega/metatron';
import { polytroposEncode } from '../src/lib/omega/polytropos';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const cost=(r:any,t:string)=>{ if(!r||r.decoded!==t) return 1e9; let v=typeof r.messageTokens==='number'?r.messageTokens:1e9;
  if(typeof r.wire==='string'&&r.wire.startsWith(CHIRON_START)){try{if(chironDecode(r.wire)===t) v=Math.min(v,T(r.wire)+T(syntomiaContract(r.wire,t)));}catch{}} return v;};
const SCRIPTS=CHIRON_SCRIPTS.map(s=>s.name);
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl','bench/holdout-mk'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>300&&t.length<12000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
console.log('scripts:',SCRIPTS.join(','));
console.log('lane'.padEnd(24),'raw'.padStart(5),'MTR'.padStart(5),'POLY'.padStart(5),'allScripts'.padStart(10),'Δ'.padStart(4),'best');
let P=0,S=0; const winner:Record<string,number>={};
for(const [n,t] of files){
  const raw=T(t); let inc:any;
  try{const r=metatronEncode(t,ENC,{budgetMs:800}); if(r.decoded===t) inc=r;}catch{}
  const m=inc?Math.min(raw,inc.messageTokens):raw;
  const pt=polytroposEncode(t,ENC,{maxConfigs:3,configBudgetMs:50,incumbent:inc});
  const pv=Math.min(raw,pt.messageTokens);
  let bs=pv,bn='-';
  for(const sc of SCRIPTS){
    for(const fn of [()=>sibylEncode(t,ENC,{budgetMs:50,wordGrid:[6],script:sc,scriptTries:1,allowPolyglot:true} as any),
                     ()=>sibylEncode(t,ENC,{budgetMs:50,wordGrid:[12],script:sc,scriptTries:1,allowPolyglot:true} as any),
                     ()=>epistemeEncode(t,ENC,{budgetMs:50,script:sc,scriptTries:1,allowPolyglot:true} as any)]){
      try{const c=cost(fn(),t); if(c<bs){bs=c;bn=sc;}}catch{}
    }
  }
  P+=pv;S+=Math.min(pv,bs);
  if(bs<pv){winner[bn]=(winner[bn]??0)+(pv-bs);
    console.log(n.padEnd(24),String(raw).padStart(5),String(m).padStart(5),String(pv).padStart(5),String(bs).padStart(10),String(pv-bs).padStart(4),bn);}
}
console.log('TOTAL'.padEnd(24),''.padStart(5),''.padStart(5),String(P).padStart(5),String(S).padStart(10),String(P-S).padStart(4));
console.log(`exhaustive script sweep on top of POLYTROPOS: ${P-S} tokens (${((P-S)/P*100).toFixed(2)}%)`);
console.log('attribution by winning script:',JSON.stringify(winner));
