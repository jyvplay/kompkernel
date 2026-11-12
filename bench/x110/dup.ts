/**
 * X110 — FRONTIER PARENT DUPLICATION AND COST.
 * `consider` keeps the strict minimum and synkrisis is first, so ties are
 * attributed to it. If several parents emit the SAME message, the frontier is
 * paying full price for duplicates. Measure each parent directly: ms, message
 * tokens, and whether its message equals the frontier winner's.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
import { synkrisisEncode } from '../../src/lib/omega/synkrisis';
import { kanonEncode } from '../../src/lib/omega/kanon';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
import { diastemaEncode } from '../../src/lib/omega/diastema';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=fs.readFileSync(process.argv[2]!,'utf8').split('\n').filter(Boolean);
const PARENTS:[string,(t:string)=>any,boolean][]=[
  ['synkrisis',(t)=>synkrisisEncode(t,enc),false],
  ['kanon',(t)=>kanonEncode(t,enc),false],
  ['akolouthia2',(t)=>akolouthia2Encode(t,enc),false],
  ['apographe',(t)=>{const r=apographeEncode(t,enc);return {message:(r.contract?r.contract+'\n':'')+r.wire};},false],
  ['diastema',(t)=>{const r=diastemaEncode(t,enc);return {message:r.contract?r.contract+'\n'+r.wire:r.wire};},false],
];
let totMs=0, dupMs=0;
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8');
  const f:any=tagstackFrontier(text,enc);
  const seen=new Map<string,string>(); const rows:string[]=[]; let laneMs=0, laneDup=0;
  for(const [name,fn] of PARENTS){
    const t0=Date.now(); let m='';
    try{ const r=fn(text); m=String(r.message??''); }catch{ m='<threw>'; }
    const ms=Date.now()-t0; laneMs+=ms;
    const first=seen.get(m);
    if(first!==undefined){ laneDup+=ms; rows.push(`${name}=DUP(${first},${ms}ms)`); }
    else { seen.set(m,name); rows.push(`${name}=${countTokens(m,enc)}tok/${ms}ms`); }
  }
  totMs+=laneMs; dupMs+=laneDup;
  console.log(`${p.split('/').pop()!.padEnd(22)} F=${String(f.messageTokens).padStart(5)} parentMs=${String(laneMs).padStart(6)} dupMs=${String(laneDup).padStart(6)}  ${rows.join('  ')}`);
}
console.log(`\nTOTAL parent ms ${totMs}   duplicate ms ${dupMs}   (${(dupMs/Math.max(1,totMs)*100).toFixed(1)} %)`);
