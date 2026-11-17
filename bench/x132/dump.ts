import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const text=fs.readFileSync(p,'utf8');
  const a:any=tagstackEncode(text,enc); const M=a.message as string;
  console.log('='.repeat(78));
  console.log('LANE',p.split('/').pop(),'len',M.length,'tokens',a.messageTokens);
  console.log('--- first 1100 chars ---');
  console.log(JSON.stringify(M.slice(0,1100)));
  const si=M.indexOf('\u00a7'), pi=M.indexOf('\u00b6');
  console.log(`--- markers: first § at ${si}, first ¶ at ${pi} ---`);
}
