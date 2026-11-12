/** X107 — what IS the contract, lane by lane, and what makes it 73 tokens on one lane and 11 on another? */
import * as fs from 'node:fs';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
import { CHIRON_START } from '../../src/lib/omega/chiron';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0';
const enc:any='o200k_base';
const ALL=fs.readFileSync('/tmp/lanes.txt','utf8').split('\n').filter(Boolean);
const WANT=(process.env.X107_LANES??'cue-sheet,psql-output,prices,ls-l-real,markdown-table,node-help,lsblk').split(',');
for(const p of ALL.filter(x=>WANT.some(w=>x.includes(w)))){
  const text=fs.readFileSync(p,'utf8');
  const r:any=tagstackFrontier(text,enc);
  const msg:string=r.message??'';
  const w=msg.indexOf(CHIRON_START);
  const c=msg.slice(0,w);
  console.log(`\n##### ${p.split('/').pop()}  msgToks=${r.messageTokens}  contractToks=${r.messageTokens-r.outTokens}  contractChars=${c.length}  ops=${JSON.stringify(r.ops??[])}`);
  console.log(JSON.stringify(c));
}
