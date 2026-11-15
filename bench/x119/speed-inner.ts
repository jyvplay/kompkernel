/** X119 speed A/B: ΣΥΝΘΕΣΙΣ inner scope on ls-l-real, interleaved, one process.
 * Both arms DIGLOSSIA=1. OFF = X118 full inner re-entry; ON = scoped inner. */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode, tagstackMemoClear } from '../../src/lib/omega/tagstack';
import { synedriaReset } from '../../src/lib/omega/synedria';
Object.assign(process.env,{OMEGA_DET:'1',OMEGA_NO_MEMO:'1',OMEGA_ENGRAM:'0',OMEGA_OURA_MEMO:'0',OMEGA_NO_OROTHESIA:'1',OMEGA_SYNEDRIA:'1',OMEGA_SYNEDRIA_CHAIN:'1',OMEGA_ENALLAGE:'1',OMEGA_MEKOS:'1',OMEGA_SYNTHESIS:'1',OMEGA_DIGLOSSIA:'1'});
const enc='o200k_base' as const;const hash=(s:string)=>createHash('sha256').update(s,'utf8').digest('hex');
const path='bench/holdout-x41/ls-l-real.txt';const text=fs.readFileSync(path,'utf8');
function run(on:boolean){process.env.OMEGA_X119_INNER_SCOPE=on?'1':'0';tagstackMemoClear();synedriaReset();const t=performance.now(),cpu=process.cpuUsage();const r=tagstackEncode(text,enc);const dt=performance.now()-t,dc=process.cpuUsage(cpu);return{on,tokens:countTokens(r.message,enc),exact:r.decoded===text,sha:hash(r.message),wallMs:dt,cpuMs:(dc.user+dc.system)/1000,notes:r.notes,message:r.message};}
const offFirst=process.argv[2]==='off-first';
let off:any,on:any;if(offFirst){off=run(false);on=run(true);}else{on=run(true);off=run(false);}
const receipt={schema:'kompkernel-x119-speed-inner-v1',path,off:{...off,message:undefined},on:{...on,message:undefined},deltaTokens:on.tokens-off.tokens,hashIdentical:off.sha===on.sha,wallSpeedup:off.wallMs/Math.max(1,on.wallMs),cpuSpeedup:off.cpuMs/Math.max(1,on.cpuMs)};
fs.writeFileSync('bench/x119/receipts/speed-inner.json',JSON.stringify(receipt,null,2)+'\n');
fs.writeFileSync('bench/x119/receipts/speed-inner-on-message.txt',on.message);
console.log(JSON.stringify(receipt,null,2));
if(!off.exact||!on.exact||on.tokens>off.tokens)process.exitCode=1;
