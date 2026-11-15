import * as fs from 'node:fs';
import { kanonEncode } from '../../src/lib/omega/kanon';
import { hyleEncode } from '../../src/lib/omega/hyle';
Object.assign(process.env,{OMEGA_DET:'1',OMEGA_NO_MEMO:'1',OMEGA_ENGRAM:'0',OMEGA_OURA_MEMO:'0',OMEGA_NO_OROTHESIA:'1'});
const enc='o200k_base' as const;const lanes=fs.readFileSync('bench/x109/lanes29.txt','utf8').split('\n').filter(Boolean);
let totalMs=0,folds=0;const rows=[];
for(const p of lanes){const text=fs.readFileSync(p,'utf8');const h=hyleEncode(text,enc,{fast:true});const nl=h.wire.indexOf('\n');const dirs=h.wire.startsWith('¦')?h.wire.slice(1,nl).split(';').filter((d:string)=>d[0]!=='B'):[];const table=dirs.some((d:string)=>d[0]==='T')&&!dirs.some((d:string)=>d[0]==='I');if(table)folds++;
 const t=performance.now();const k=kanonEncode(text,enc);const ms=performance.now()-t;totalMs+=ms;rows.push({path:p,table,ms:Math.round(ms),M:k.messageTokens,winner:k.winner});console.log(p.split('/').pop(),table,Math.round(ms),k.messageTokens,k.winner);}
fs.writeFileSync('bench/x119/receipts/kanon-all.json',JSON.stringify({totalMs:Math.round(totalMs),folds,rows},null,2)+'\n');
console.log('TOTAL kanon ms',Math.round(totalMs),'table folds',folds);
