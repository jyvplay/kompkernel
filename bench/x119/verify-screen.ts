/** Zero-encoder: apply the SHIPPED diglossia module to the X118 frontier wires. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { diglossiaEncode } from '../../src/lib/omega/diglossia';
import { chironDecode, CHIRON_START } from '../../src/lib/omega/chiron';
Object.assign(process.env,{OMEGA_DET:'1'});delete process.env.OMEGA_NO_DIGLOSSIA;
const enc='o200k_base' as const;
const rows=fs.readFileSync('bench/x119/receipts/frontier.jsonl','utf8').trim().split('\n').map(JSON.parse);
let base=0,after=0,wins=0;const out=[];
for(const r of rows){let m=r.message;if(r.path.endsWith('/ls-l-real.txt'))m=fs.readFileSync('bench/x118/receipts/regate-lsl-message.txt','utf8');
 const b=countTokens(m,enc);const w=m.indexOf(CHIRON_START);const ref=w>=0?chironDecode(m.slice(w)):m;
 const res=diglossiaEncode('',enc,{message:m,messageTokens:b,decoded:ref});
 const a=countTokens(res.message,enc);base+=b;after+=a;if(a<b)wins++;
 const ok=w<0||chironDecode(res.message.slice(res.message.indexOf(CHIRON_START)))===ref;
 out.push({path:r.path,base:b,after:a,delta:a-b,applied:res.applied,exact:ok,adopt:res.adopt,bypass:res.bypass,rounds:res.rounds});
 console.log(`${r.path.split('/').pop()!.padEnd(22)} ${b} -> ${a} Δ=${a-b} exact=${ok} A${res.adopt}/B${res.bypass} r${res.rounds}`);
}
fs.writeFileSync('bench/x119/receipts/verify-screen.json',JSON.stringify({schema:'kompkernel-x119-verify-screen-v1',totals:{base,after,delta:after-base,wins},rows:out},null,2)+'\n');
console.log(`TOTAL ${base} -> ${after} Δ=${after-base} wins=${wins}/29`);
