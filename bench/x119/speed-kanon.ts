/** X119 speed seam: KANON's DAEDALUS arm on the HYLE-folded body of ls-l-real. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { hyleEncode } from '../../src/lib/omega/hyle';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
Object.assign(process.env,{OMEGA_DET:'1',OMEGA_NO_MEMO:'1',OMEGA_ENGRAM:'0',OMEGA_OURA_MEMO:'0',OMEGA_NO_OROTHESIA:'1'});
const enc='o200k_base' as const;
const text=fs.readFileSync('bench/holdout-x41/ls-l-real.txt','utf8');
const t0=performance.now();
const h=hyleEncode(text,enc,{fast:true});
const tH=performance.now()-t0;
const nl=h.wire.indexOf('\n');
const dirs=h.wire.slice(1,nl).split(';').filter(d=>d[0]!=='B');
const body=h.wire.slice(nl+1);
console.log('hyle fast ms',Math.round(tH),'dirs',dirs.join(';'),'bodyChars',body.length,'bodyTok',countTokens(body,enc));
const rows=[];
for(const maxArms of [1,2]){
  const t=performance.now(),cpu=process.cpuUsage();
  const d=daedalusEncode(body,enc,{maxArms});
  const dt=performance.now()-t,dc=process.cpuUsage(cpu);
  rows.push({maxArms,ms:dt,cpuMs:(dc.user+dc.system)/1000,M:d.messageTokens,wireTok:d.outTokens,armsRun:d.armsRun,winningArm:d.winningArm,predictedArm:d.predictedArm,exact:d.exact});
  console.log(JSON.stringify(rows[rows.length-1]));
}
fs.writeFileSync('bench/x119/receipts/speed-kanon.json',JSON.stringify({lane:'ls-l-real',hyleMs:tH,dirs,bodyChars:body.length,rows},null,2)+'\n');
