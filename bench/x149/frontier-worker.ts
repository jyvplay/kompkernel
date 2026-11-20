/** X149 single-lane frontier worker (child process of frontier-parallel).
 * Same per-lane logic and flags as bench/x148/frontier.ts; writes its own jsonl.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=fs.readFileSync(process.argv[2]!,'utf8').split('\n').filter(Boolean);
const f=fs.openSync(process.argv[3]!,'w');
for(const p of lanes){
 const text=fs.readFileSync(p,'utf8'); const t=Date.now(); const a=tagstackEncode(text,enc); const elapsed=Date.now()-t;
 if(a.decoded!==text){console.log('BAD',p);process.exit(3);}
 fs.writeSync(f,JSON.stringify({path:p,text,message:a.message,tokens:a.messageTokens,ms:elapsed,decoded:a.decoded,notes:a.notes})+'\n');
 console.log(p,a.messageTokens,elapsed,a.decoded===text);
}
