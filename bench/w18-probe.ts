import fs from 'node:fs'; import path from 'node:path';
import { countTokens, tokenStrings, type EncodingName } from '../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode, chironSeparators } from '../src/lib/omega/chiron';
import { syntomiaContract } from '../src/lib/omega/syntomia';
import { sibylEncode } from '../src/lib/omega/sibyl';
import { ariadneEncode } from '../src/lib/omega/ariadne';
import { metatronEncode } from '../src/lib/omega/metatron';
import { logistikeEncode } from '../src/lib/omega/logistike';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const cost=(r:any,t:string)=>{ if(!r||r.decoded!==t) return 1e9; let v=typeof r.messageTokens==='number'?r.messageTokens:1e9;
  if(typeof r.wire==='string'&&r.wire.startsWith(CHIRON_START)){try{if(chironDecode(r.wire)===t) v=Math.min(v,T(r.wire)+T(syntomiaContract(r.wire,t)));}catch{}} return v;};
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout','bench/holdout-work','bench/holdout-lang','bench/holdout-tbl','bench/holdout-mk','bench/holdout-ops','bench/holdout-tab'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>200&&t.length<24000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}

console.log('=== 1. SEPARATOR SWEEP: is `sep` an unswept portfolio dimension? ===');
console.log('lane'.padEnd(26),'base'.padStart(6),'bestSep'.padStart(8),'Δ'.padStart(5),'sep','  candidates');
let sepGain=0;
for(const [n,t] of files){
  const seps=chironSeparators(t);
  let base=1e9; try{base=Math.min(base,cost(sibylEncode(t,ENC,{budgetMs:60,wordGrid:[6]} as any),t));}catch{}
  let best=base, bs='-';
  for(const s of seps){
    for(const fn of [()=>sibylEncode(t,ENC,{budgetMs:60,wordGrid:[6],sep:s} as any),()=>ariadneEncode(t,ENC,{budgetMs:60,sep:s} as any)]){
      try{const c=cost(fn(),t); if(c<best){best=c;bs=JSON.stringify(s);}}catch{}
    }
  }
  if(best<base){sepGain+=base-best;
    console.log(n.padEnd(26),String(base).padStart(6),String(best).padStart(8),String(base-best).padStart(5),bs.padEnd(5),seps.map(x=>JSON.stringify(x)).join(' '));}
}
console.log(`separator sweep total gain: ${sepGain} tokens`);

console.log('\n=== 2. RESIDUE CENSUS: what is left in the best wire? ===');
console.log('lane'.padEnd(24),'wire'.padStart(5),'glyph%'.padStart(7),'word%'.padStart(7),'num%'.padStart(6),'punct%'.padStart(7),'ws%'.padStart(5),'tape%'.padStart(6));
const agg={g:0,w:0,n:0,p:0,s:0,tot:0,tape:0};
for(const [nm,t] of files.slice(0,16)){
  let w:string|null=null,bc=1e9;
  for(const fn of [()=>sibylEncode(t,ENC,{budgetMs:60,wordGrid:[6]} as any),()=>sibylEncode(t,ENC,{budgetMs:60,wordGrid:[12]} as any)]){
    try{const r=fn(); const c=cost(r,t); if(c<bc&&typeof r.wire==='string'&&r.wire.startsWith(CHIRON_START)){bc=c;w=r.wire;}}catch{}
  }
  if(!w) continue;
  const k=w.indexOf(CHIRON_SEP); const tape=w.slice(0,k+1), body=w.slice(k+1);
  const ts=tokenStrings(body,ENC);
  let g=0,wd=0,nu=0,pu=0,sp=0;
  for(const s of ts){
    if(/^\s+$/.test(s)) sp++;
    else if([...s].some(c=>(c.codePointAt(0)??0)>=0x370)) g++;
    else if(/\p{L}/u.test(s)) wd++;
    else if(/\p{N}/u.test(s)) nu++;
    else pu++;
  }
  const tot=ts.length; const tp=T(tape);
  agg.g+=g;agg.w+=wd;agg.n+=nu;agg.p+=pu;agg.s+=sp;agg.tot+=tot;agg.tape+=tp;
  console.log(nm.padEnd(24),String(T(w)).padStart(5),(100*g/tot).toFixed(1).padStart(7),(100*wd/tot).toFixed(1).padStart(7),
    (100*nu/tot).toFixed(1).padStart(6),(100*pu/tot).toFixed(1).padStart(7),(100*sp/tot).toFixed(1).padStart(5),(100*tp/(tp+tot)).toFixed(1).padStart(6));
}
console.log('AGGREGATE'.padEnd(24),''.padStart(5),(100*agg.g/agg.tot).toFixed(1).padStart(7),(100*agg.w/agg.tot).toFixed(1).padStart(7),
  (100*agg.n/agg.tot).toFixed(1).padStart(6),(100*agg.p/agg.tot).toFixed(1).padStart(7),(100*agg.s/agg.tot).toFixed(1).padStart(5),(100*agg.tape/(agg.tape+agg.tot)).toFixed(1).padStart(6));

console.log('\n=== 3. SELF-ITERATION: run an arm on the wire body, merge rules ===');
let itGain=0;
for(const [nm,t] of files.slice(0,14)){
  let w:string|null=null,bc=1e9;
  try{const r=sibylEncode(t,ENC,{budgetMs:60,wordGrid:[6]} as any); const c=cost(r,t); if(c<bc&&typeof r.wire==='string'&&r.wire.startsWith(CHIRON_START)){bc=c;w=r.wire;}}catch{}
  if(!w) continue;
  const k=w.indexOf(CHIRON_SEP); const body=w.slice(k+1);
  let g2=1e9;
  try{ const r2=sibylEncode(body,ENC,{budgetMs:60,wordGrid:[6]} as any);
    if(r2.decoded===body&&typeof r2.wire==='string'&&r2.wire.startsWith(CHIRON_START)){
      const k2=r2.wire.indexOf(CHIRON_SEP);
      const merged=CHIRON_START+w.slice(1,k)+r2.wire.slice(1,k2)+CHIRON_SEP+r2.wire.slice(k2+1);
      if(chironDecode(merged)===t) g2=T(merged)+T(syntomiaContract(merged,t));
    } }catch{}
  if(g2<bc){itGain+=bc-g2; console.log(nm.padEnd(24),'base',String(bc).padStart(5),'iterated',String(g2).padStart(5),'Δ',bc-g2);}
}
console.log(`self-iteration total gain: ${itGain} tokens`);
