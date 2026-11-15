/** X119 speed screen: extend the X93 CHIRON 0.25 factor to the large (>8000)
 * regime on ls-l-real. Interleaved, one process, DIGLOSSIA=1 both arms. */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode, tagstackMemoClear } from '../../src/lib/omega/tagstack';
import { synedriaReset } from '../../src/lib/omega/synedria';
import { chironBudgetFor, workBudgetFor } from '../../src/lib/omega/workmeter';
Object.assign(process.env,{OMEGA_DET:'1',OMEGA_NO_MEMO:'1',OMEGA_ENGRAM:'0',OMEGA_OURA_MEMO:'0',OMEGA_NO_OROTHESIA:'1',OMEGA_SYNEDRIA:'1',OMEGA_SYNEDRIA_CHAIN:'1',OMEGA_ENALLAGE:'1',OMEGA_MEKOS:'1',OMEGA_SYNTHESIS:'1',OMEGA_DIGLOSSIA:'1'});
delete process.env.OMEGA_WORK_BUDGET;delete process.env.OMEGA_CHIRON_BUDGET;
const enc='o200k_base' as const;const hash=(s:string)=>createHash('sha256').update(s,'utf8').digest('hex');
const path='bench/holdout-x41/ls-l-real.txt';const text=fs.readFileSync(path,'utf8');
const baseW=workBudgetFor(text.length),baseC=chironBudgetFor(text.length);
function run(cFactor:number){process.env.OMEGA_WORK_BUDGET=String(baseW);process.env.OMEGA_CHIRON_BUDGET=String(Math.round(baseC*cFactor));tagstackMemoClear();synedriaReset();const t=performance.now(),cpu=process.cpuUsage();const r=tagstackEncode(text,enc);const dt=performance.now()-t,dc=process.cpuUsage(cpu);return{cFactor,tokens:countTokens(r.message,enc),exact:r.decoded===text,sha:hash(r.message),wallMs:dt,cpuMs:(dc.user+dc.system)/1000};}
const offFirst=process.argv[2]==='off-first';
let def:any,red:any;if(offFirst){def=run(1);red=run(0.25);}else{red=run(0.25);def=run(1);}
const receipt={schema:'kompkernel-x119-speed-budget-v1',path,baseW,baseC,def,red,deltaTokens:red.tokens-def.tokens,hashIdentical:def.sha===red.sha,wallSpeedup:def.wallMs/Math.max(1,red.wallMs),cpuSpeedup:def.cpuMs/Math.max(1,red.cpuMs)};
fs.writeFileSync('bench/x119/receipts/speed-budget.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
if(!def.exact||!red.exact||red.tokens>def.tokens)process.exitCode=1;
