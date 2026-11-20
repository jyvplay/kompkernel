/** X135 fresh 29-lane frontier; reused X134 harness.
 * The decoded attribute is recorded, NOT an independent emitted-wire proof.
 * ALLOMORPH and ANAKYKLI are unwired; this measures shipped X133 defaults.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=fs.readFileSync('bench/x109/lanes29.txt','utf8').split('\n').filter(Boolean);
const f=fs.openSync('bench/x143/receipts/frontier.jsonl','w');
let total=0,ms=0,bad=0;
for(const p of lanes){
 const text=fs.readFileSync(p,'utf8'); const t=Date.now(); const a=tagstackEncode(text,enc); const elapsed=Date.now()-t;
 total+=a.messageTokens; ms+=elapsed; if(a.decoded!==text)bad++;
 const row={path:p,text,message:a.message,tokens:a.messageTokens,ms:elapsed,decoded:a.decoded,notes:a.notes};
 fs.writeSync(f,JSON.stringify(row)+'\n'); console.log(p,a.messageTokens,elapsed,a.decoded===text);
}
console.log(JSON.stringify({total,ms,bad}));
