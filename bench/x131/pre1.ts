import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const text=fs.readFileSync(p,'utf8');
  const a:any=tagstackEncode(text,enc); const M=a.message as string;
  const i1=M.indexOf('\u00a7');
  const pre = i1<0? M : M.slice(0,i1);
  console.log('='.repeat(72));
  console.log('LANE',p.split('/').pop(),'| pre tokens',countTokens(pre,enc),'| out',a.messageTokens);
  console.log(pre);
}
