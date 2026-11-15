import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
Object.assign(process.env,{OMEGA_DET:'1',OMEGA_NO_MEMO:'1',OMEGA_ENGRAM:'0',OMEGA_OURA_MEMO:'0',OMEGA_NO_OROTHESIA:'1'});
const enc='o200k_base' as const;const hash=(s:string)=>createHash('sha256').update(s,'utf8').digest('hex');
const lanes=fs.readFileSync('bench/x109/lanes29.txt','utf8').split('\n').filter(Boolean);
let ms1=0,ms2=0,diff=0,worse=0;const rows=[];
for(const p of lanes){const text=fs.readFileSync(p,'utf8');
 const t1=performance.now();const a=daedalusEncode(text,enc,{maxArms:1});const d1=performance.now()-t1;
 const t2=performance.now();const b=daedalusEncode(text,enc,{maxArms:2});const d2=performance.now()-t2;
 ms1+=d1;ms2+=d2;const same=hash(a.wire)===hash(b.wire);if(!same)diff++;if(a.messageTokens>b.messageTokens)worse++;
 rows.push({path:p,ms1:Math.round(d1),ms2:Math.round(d2),M1:a.messageTokens,M2:b.messageTokens,same,arm1:a.winningArm,arm2:b.winningArm});
 console.log(p.split('/').pop(),a.messageTokens,b.messageTokens,same,a.winningArm,b.winningArm,Math.round(d1),Math.round(d2));}
fs.writeFileSync('bench/x119/receipts/daedalus-arms.json',JSON.stringify({ms1:Math.round(ms1),ms2:Math.round(ms2),speedup:ms2/Math.max(1,ms1),diff,worse,rows},null,2)+'\n');
console.log('TOTAL',Math.round(ms1),Math.round(ms2),'speedup',(ms2/ms1).toFixed(3),'diff',diff,'worse',worse);
