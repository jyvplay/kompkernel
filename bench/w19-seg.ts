/** ORACLE: is per-REGION config selection worth more than per-DOCUMENT? */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironParseTape, chironInScript, chironDecode } from '../src/lib/omega/chiron';
import { syntomiaContract } from '../src/lib/omega/syntomia';
import { sibylEncode } from '../src/lib/omega/sibyl';
import { epistemeEncode } from '../src/lib/omega/episteme';
import { metatronEncode } from '../src/lib/omega/metatron';
import { polytroposEncode } from '../src/lib/omega/polytropos';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
function scriptOf(ch:string){const cp=ch.codePointAt(0)!;for(const s of CHIRON_SCRIPTS) if(chironInScript(s,cp)) return s;return null;}

/** feature vector per block */
function feat(s:string){const n=s.length||1;let nl=0,sp=0,pu=0,dg=0;
  for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);
    if(c===32)sp++; else if(c>=0x2e80)nl++;
    else if(c>=48&&c<=57)dg++;
    else if(c<128&&!((c>=65&&c<=90)||(c>=97&&c<=122)))pu++;}
  const cols=(s.match(/ {2,}/g)??[]).length;
  return [100*nl/n,100*sp/n,100*pu/n,100*dg/n,1000*cols/n];}
const dist=(a:number[],b:number[])=>a.reduce((s,x,i)=>s+Math.abs(x-b[i]),0);

/** split into homogeneous regions: blank-line blocks merged by feature distance */
function regions(t:string,maxR=5){
  const blocks=t.split(/(?<=\n)(?=\n)/).length>1 ? t.split(/\n\n+/).map((b,i,a)=>i<a.length-1?b+'\n\n':b) : [t];
  if(blocks.length<=1) return [t];
  const fs_=blocks.map(feat);
  const parts:string[]=[]; let cur=blocks[0], cf=fs_[0], cn=1;
  for(let i=1;i<blocks.length;i++){
    if(dist(cf,fs_[i])<18 || parts.length>=maxR-1 || blocks[i].length<40){ cur+=blocks[i]; cf=cf.map((x,k)=>(x*cn+fs_[i][k])/(cn+1)); cn++; }
    else { parts.push(cur); cur=blocks[i]; cf=fs_[i]; cn=1; }
  }
  parts.push(cur);
  return parts.filter(p=>p.length>0);
}
const CFG:Array<[string,(t:string)=>any]>=[
  ['w6', t=>sibylEncode(t,ENC,{budgetMs:60,wordGrid:[6]} as any)],
  ['w12',t=>sibylEncode(t,ENC,{budgetMs:60,wordGrid:[12]} as any)],
  ['cap16',t=>sibylEncode(t,ENC,{budgetMs:60,wordGrid:[6],capGrid:[16]} as any)],
  ['ep', t=>epistemeEncode(t,ENC,{budgetMs:60} as any)],
];
function pool(avoid:string,scriptName:string,k:number){
  const sc=CHIRON_SCRIPTS.find(s=>s.name===scriptName)!; const used=new Set([...avoid]); const out:string[]=[];
  const spans=sc.ranges??[[sc.lo,sc.hi] as [number,number]];
  for(const [a,b] of spans){for(let cp=a;cp<b&&out.length<k;cp++){const ch=String.fromCodePoint(cp);
    if(!used.has(ch)&&T(ch)===1&&/^\p{L}$/u.test(ch)) out.push(ch);} if(out.length>=k)break;}
  return out;}

const files:Array<[string,string]>=[];
for(const d of ['bench/holdout','bench/holdout-work','bench/holdout-lang','bench/holdout-tbl','bench/holdout-mk'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>400&&t.length<16000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
console.log('lane'.padEnd(26),'raw'.padStart(6),'MTR'.padStart(6),'POLY'.padStart(6),'SEG'.padStart(6),'Δ'.padStart(5),'reg','cfgs');
let R=0,M=0,P=0,S=0;
for(const [n,t] of files){
  const raw=T(t); let inc:any;
  try{const r=metatronEncode(t,ENC,{budgetMs:1200}); if(r.decoded===t) inc=r;}catch{}
  const m=inc?Math.min(raw,inc.messageTokens):raw;
  const pt=polytroposEncode(t,ENC,{maxConfigs:4,configBudgetMs:60,incumbent:inc});
  const pv=Math.min(raw,pt.messageTokens);
  // --- segmented: per-region best config, glyphs remapped into one script, tapes concatenated
  const regs=regions(t);
  let seg=pv, chosen:string[]=[];
  if(regs.length>=2){
    for(const scriptName of ['cyrillic','polyglot']){
      let tapes='',bodies='',okAll=true; const picks:string[]=[];
      let avoid=t;
      for(const rg of regs){
        let bw:string|null=null,bc=1e9,bn='-';
        for(const [cn,fn] of CFG){
          try{const r=fn(rg); if(r&&r.decoded===rg&&typeof r.wire==='string'&&r.wire.startsWith(CHIRON_START)&&chironDecode(r.wire)===rg){
            const c=T(r.wire); if(c<bc){bc=c;bw=r.wire;bn=cn;} }}catch{}
        }
        if(!bw||bc>=T(rg)){ bodies+=rg; picks.push('raw'); continue; }
        const k=bw.indexOf(CHIRON_SEP); const tp=bw.slice(1,k); let bd=bw.slice(k+1);
        const sc=tp.length?scriptOf(tp[0]):null; if(!sc){okAll=false;break;}
        const rs=chironParseTape(tp,sc); if(!rs){okAll=false;break;}
        const fresh=pool(avoid+tapes+bodies,scriptName,rs.length); if(fresh.length<rs.length){okAll=false;break;}
        let ntp=''; rs.forEach((r2,i)=>{ const g=fresh[i];
          bd=bd.split(r2.glyph).join('\u0000'+i+'\u0001');
          ntp+='\u0000'+i+'\u0001'+r2.raw; });
        // second pass: materialise placeholders
        rs.forEach((_,i)=>{ const g=fresh[i]; ntp=ntp.split('\u0000'+i+'\u0001').join(g); bd=bd.split('\u0000'+i+'\u0001').join(g); });
        tapes+=ntp; bodies+=bd; avoid+=ntp; picks.push(bn);
      }
      if(!okAll) continue;
      const merged=CHIRON_START+tapes+CHIRON_SEP+bodies;
      if(chironDecode(merged)!==t) continue;
      const c=T(merged)+T(syntomiaContract(merged,t));
      if(c<seg){seg=c;chosen=picks;}
    }
  }
  R+=raw;M+=m;P+=pv;S+=Math.min(pv,seg);
  if(seg<pv) console.log(n.padEnd(26),String(raw).padStart(6),String(m).padStart(6),String(pv).padStart(6),String(seg).padStart(6),String(pv-seg).padStart(5),String(regs.length).padStart(3),chosen.join(','));
}
console.log('TOTAL'.padEnd(26),String(R).padStart(6),String(M).padStart(6),String(P).padStart(6),String(S).padStart(6),String(P-S).padStart(5));
console.log(`per-region vs per-document: ${P-S} tokens (${((P-S)/P*100).toFixed(2)}%); combined vs METATRON ${M-S} (${((M-S)/M*100).toFixed(2)}%)`);
