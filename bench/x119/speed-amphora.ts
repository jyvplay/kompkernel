import * as fs from 'node:fs';
import { amphoraEncode } from '../../src/lib/omega/amphora';
import { kanonEncode } from '../../src/lib/omega/kanon';
Object.assign(process.env,{OMEGA_DET:'1',OMEGA_NO_MEMO:'1',OMEGA_ENGRAM:'0',OMEGA_OURA_MEMO:'0',OMEGA_NO_OROTHESIA:'1'});
const enc='o200k_base' as const;
const text=fs.readFileSync('bench/holdout-x41/ls-l-real.txt','utf8');
for(const [name,fn] of [['amphora',()=>amphoraEncode(text,enc)],['kanon',()=>kanonEncode(text,enc)]] as const){
 const t=performance.now(),cpu=process.cpuUsage();const r:any=fn();const dt=performance.now()-t,dc=process.cpuUsage(cpu);
 console.log(name,JSON.stringify({ms:Math.round(dt),cpuMs:Math.round((dc.user+dc.system)/1000),M:r.messageTokens,winner:r.winner,gate:r.gate,exact:r.exact}));
}
