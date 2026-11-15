/** X119: where does ls-l-real's 818 s go? One council, parents in chain order. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { synkrisisEncode } from '../../src/lib/omega/synkrisis';
import { kanonEncode } from '../../src/lib/omega/kanon';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { apographeEncode } from '../../src/lib/omega/apographe';
import { diastemaEncode } from '../../src/lib/omega/diastema';
import { metronPlan, metronEncode } from '../../src/lib/omega/metron';
import { synedriaChainScope, synedriaReset } from '../../src/lib/omega/synedria';
Object.assign(process.env,{OMEGA_DET:'1',OMEGA_NO_MEMO:'1',OMEGA_ENGRAM:'0',OMEGA_OURA_MEMO:'0',OMEGA_NO_OROTHESIA:'1',OMEGA_SYNEDRIA:'1',OMEGA_SYNEDRIA_CHAIN:'1',OMEGA_ENALLAGE:'1',OMEGA_MEKOS:'1',OMEGA_SYNTHESIS:'1'});
const enc='o200k_base' as const;
const text=fs.readFileSync(process.argv[2]??'bench/holdout-x41/ls-l-real.txt','utf8');
synedriaReset();
const rows:any[]=[];
synedriaChainScope(()=>{
 const run=(name:string,fn:()=>any)=>{const t=performance.now(),cpu=process.cpuUsage();let r:any,err=null;try{r=fn();}catch(e){err=String(e);}const dt=performance.now()-t,dc=process.cpuUsage(cpu);const row={name,ms:Math.round(dt),cpuMs:Math.round((dc.user+dc.system)/1000),M:r?.messageTokens??null,err};rows.push(row);console.log(JSON.stringify(row));fs.writeFileSync('bench/x119/receipts/parent-ms.json',JSON.stringify({lane:process.argv[2]??'ls-l-real',rows},null,2)+'\n');};
 run('synkrisis',()=>synkrisisEncode(text,enc));
 run('kanon',()=>kanonEncode(text,enc));
 run('akolouthia2',()=>akolouthia2Encode(text,enc));
 run('apographe',()=>apographeEncode(text,enc));
 const mp=metronPlan(text,enc); if(mp?.proxyGain) run('metron',()=>metronEncode(text,enc)); else console.log('metron plan closed');
 run('diastema',()=>diastemaEncode(text,enc));
});
console.log('TOTAL ms',rows.reduce((a,r)=>a+r.ms,0));
