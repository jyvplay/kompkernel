import * as fs from 'node:fs';
process.env.OMEGA_DET='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
if(process.env.MEMO==='0') process.env.OMEGA_NO_MEMO='1';
const {tagstackEncode}=await import('../../src/lib/omega/tagstack');
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const t=fs.readFileSync(p,'utf8');
  const t0=Date.now();
  const a:any=tagstackEncode(t,'o200k_base' as any);
  console.log(`  ${p.split('/').pop()!.padEnd(20)} ${String(Date.now()-t0).padStart(7)}ms  out=${a.messageTokens}`);
}
