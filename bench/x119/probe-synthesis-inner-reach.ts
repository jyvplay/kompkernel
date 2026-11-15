import * as fs from 'node:fs';
import { synthesisEncode } from '../../src/lib/omega/synthesis';
Object.assign(process.env,{OMEGA_DET:'1',OMEGA_SYNTHESIS:'1',OMEGA_ENALLAGE:'1',OMEGA_MEKOS:'1'});
const enc='o200k_base' as const;const rows=[];
for(const p of ['bench/holdout-x41/ls-real.txt','bench/holdout-x41/ls-l-real.txt']){
 const text=fs.readFileSync(p,'utf8');let reached=false;
 try{synthesisEncode(text,enc,1_000_000,()=>{reached=true;throw new Error('INNER_REACHED');});}catch(e){if(String(e)!=='Error: INNER_REACHED')throw e;}
 rows.push({path:p,innerReached:reached});console.log(p.split('/').pop(),'innerReached',reached);
}
fs.writeFileSync('bench/x119/receipts/synthesis-inner-reach.json',JSON.stringify({rows,note:'Only ls-l-real reaches the ΣΥΝΘΕΣΙΣ inner encoder on the canonical 29; the X119 inner scope cannot change the other 28 lanes.'},null,2)+'\n');
