/** Whitespace-column (fixed-width) transpose: the lane KIONES declines on. */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { CHIRON_START, chironDecode } from '../src/lib/omega/chiron';
import { syntomiaContract } from '../src/lib/omega/syntomia';
import { sibylEncode } from '../src/lib/omega/sibyl';
import { epistemeEncode } from '../src/lib/omega/episteme';
import { metatronEncode } from '../src/lib/omega/metatron';
import { kionesEncode } from '../src/lib/omega/kiones';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const best=(t:string)=>{let b=T(t);
  for(const fn of [()=>sibylEncode(t,ENC,{budgetMs:60,wordGrid:[6]} as any),
                   ()=>sibylEncode(t,ENC,{budgetMs:60,wordGrid:[12]} as any),
                   ()=>sibylEncode(t,ENC,{budgetMs:60,wordGrid:[6],capGrid:[16]} as any),
                   ()=>epistemeEncode(t,ENC,{budgetMs:60} as any)]){
    try{const r=fn(); if(r&&r.decoded===t&&typeof r.wire==='string'&&r.wire.startsWith(CHIRON_START)&&chironDecode(r.wire)===t)
      b=Math.min(b,T(r.wire)+T(syntomiaContract(r.wire,t)));}catch{} }
  return b;};
/** boundaries: positions where EVERY line has whitespace at p-1 and p (or is short) */
function cuts(lines:string[]){
  const W=Math.max(...lines.map(l=>l.length));
  const ws=(l:string,p:number)=>p>=l.length||l[p]===' '||l[p]==='\t';
  const out:number[]=[];
  for(let p=1;p<W;p++){
    if(lines.every(l=>ws(l,p)&&ws(l,p-1)) && !lines.every(l=>ws(l,p+1)&&p+1<W)) out.push(p);
  }
  // keep cuts that are the LAST ws position of each gap run -> field starts at a non-ws char
  const keep:number[]=[];
  for(const p of out){ if(lines.some(l=>p<l.length&&l[p]!==' '&&l[p]!=='\t')) continue; keep.push(p); }
  const fin:number[]=[];
  for(let i=0;i<keep.length;i++){ const p=keep[i]; if(lines.every(l=>p+1>=l.length||(l[p+1]===' '||l[p+1]==='\t'))) continue; fin.push(p+1); }
  return fin;
}
function split(l:string,cs:number[]){const f:string[]=[];let prev=0;
  for(const c of cs){ f.push(l.slice(prev,Math.min(c,l.length))); prev=Math.min(c,l.length); }
  f.push(l.slice(prev)); return f;}
const SENT='\u00ac';
function fwTranspose(t:string,minLines=5){
  if(t.includes(SENT)||t.includes('◆')||t.includes('◇')) return null;
  const hadTrail=t.endsWith('\n'); const body=hadTrail?t.slice(0,-1):t;
  const lines=body.split('\n'); if(lines.length<minLines) return null;
  let bestOut:string|null=null,bestTok=T(t);
  // try maximal runs of non-empty lines
  let i=0;
  while(i<lines.length){
    if(!lines[i].trim()){i++;continue;}
    let j=i+1; while(j<lines.length&&lines[j].trim())j++;
    if(j-i>=minLines){
      const run=lines.slice(i,j); const cs=cuts(run);
      if(cs.length>=1){
        const rows=run.map(l=>split(l,cs)); const C=rows[0].length;
        if(rows.every(r=>r.length===C)){
          const cols:string[]=[]; for(let c=0;c<C;c++) cols.push(rows.map(r=>r[c]).join(SENT));
          const rep='◆'+'\n'+cols.join('\n')+'\n'+'◇';
          const out=[...lines.slice(0,i),rep,...lines.slice(j)].join('\n')+(hadTrail?'\n':'');
          // inverse
          const back=(()=>{const L=(hadTrail?out.slice(0,-1):out).split('\n');
            const o=L.findIndex(x=>x==='◆'); if(o<0)return null;
            let cl=-1; for(let k=o+1;k<L.length;k++) if(L[k]==='◇'){cl=k;break;}
            if(cl<0)return null;
            const cc=L.slice(o+1,cl).map(x=>x.split(SENT)); const h=cc[0].length;
            if(!cc.every(x=>x.length===h))return null;
            const rr:string[]=[]; for(let r=0;r<h;r++) rr.push(cc.map(x=>x[r]).join(''));
            return [...L.slice(0,o),...rr,...L.slice(cl+1)].join('\n')+(hadTrail?'\n':'');})();
          if(back===t){ const tk=T(out); if(tk<bestTok){bestTok=tk;bestOut=out;} }
        }
      }
    }
    i=j>i?j:i+1;
  }
  return bestOut;
}
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout-tbl','bench/holdout-ops','bench/holdout-tab','bench/holdout-mk','bench/holdout'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>300&&t.length<20000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
console.log('lane'.padEnd(26),'raw'.padStart(6),'MTR'.padStart(6),'KION'.padStart(6),'rawFW'.padStart(6),'bestFW'.padStart(7),'Δ'.padStart(5));
let K=0,B=0;
for(const [n,t] of files){
  const raw=T(t); let inc:any;
  try{const r=metatronEncode(t,ENC,{budgetMs:1000}); if(r.decoded===t) inc=r;}catch{}
  const m=inc?Math.min(raw,inc.messageTokens):raw;
  const kn=kionesEncode(t,ENC,{maxConfigs:3,configBudgetMs:55,incumbent:inc});
  const kv=Math.min(raw,kn.messageTokens);
  const fw=fwTranspose(t);
  let bf=kv;
  if(fw){ const c=best(fw)+12; if(c<bf) bf=c; }
  K+=kv;B+=Math.min(kv,bf);
  if(bf<kv) console.log(n.padEnd(26),String(raw).padStart(6),String(m).padStart(6),String(kv).padStart(6),String(fw?T(fw):0).padStart(6),String(bf).padStart(7),String(kv-bf).padStart(5));
}
console.log('TOTAL'.padEnd(26),''.padStart(6),''.padStart(6),String(K).padStart(6),''.padStart(6),String(B).padStart(7),String(K-B).padStart(5));
console.log(`fixed-width transpose on top of KIONES: ${K-B} tokens (${((K-B)/K*100).toFixed(2)}%)`);
