import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { eurosFromFrontier } from '../../src/lib/omega/euros';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const text=fs.readFileSync(p,'utf8');
  const a:any=tagstackEncode(text,'o200k_base' as any);
  const r:any=eurosFromFrontier(a,text,'o200k_base' as any);
  const msg=r?r.message:a.message;
  console.log('=== '+p+' ===');
  // print the tape / dictionary section: everything between § and the final body
  const lines=msg.split('\n');
  lines.forEach((l,i)=>{
    const tag=l.startsWith('§')?'TAPE':l.startsWith('¶')?'PRE':(i>=lines.length-2?'BODY':'TAPE');
    console.log(`[${tag}] ${JSON.stringify(l)}`);
  });
}
