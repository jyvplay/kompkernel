/** X106 — what IS the contract, and what makes it 73 tokens on one lane and 11 on another? */
import * as fs from 'node:fs';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
import { CHIRON_START } from '../../src/lib/omega/chiron';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0';
process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const ALL=fs.readFileSync('/tmp/lanes.txt','utf8').split('\n').filter(Boolean);
for(const p of ALL){
  const text=fs.readFileSync(p,'utf8');
  const r:any=tagstackFrontier(text,enc);
  const msg:string=r.message??'';
  const w=msg.indexOf(CHIRON_START);
  const c=msg.slice(0,w);
  const tEnd=msg.indexOf('\u00b6',w);
  const tape=msg.slice(w+1,tEnd);
  const ct=r.messageTokens-r.outTokens;
  if(ct>=20||process.env.X106_ALL==='1')
    console.log(`${p.split('/').pop()!.padEnd(22)} contractToks ${String(ct).padStart(3)}  ops=${JSON.stringify(r.ops??[])}  contractChars ${String(c.length).padStart(4)}  tapeChars ${String(tape.length).padStart(5)}`);
}
