import fs from 'node:fs';
import { chironFindBlocks, chironEncode } from '@/lib/omega/chiron';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const f='bench/holdout-mk/dump.sql';
const text=fs.readFileSync(f,'utf8');
const blank='\u0001';
for (const ms of [300,600,1425,5000,15000]) {
  const c=chironFindBlocks(text,blank,'\n',enc,Date.now()+ms);
  console.log('deadline',String(ms).padStart(6),'-> blocks',c.length,'gain',c.reduce((s,x)=>s+x.gain,0).toFixed(0));
}
console.log('--- chironEncode with explicit budgetMs ---');
for (const b of [6475, 20000, 60000]) {
  const t0=Date.now();
  const r:any=chironEncode(text,enc,{budgetMs:b});
  console.log('budgetMs',String(b).padStart(6),'-> msg',r.messageTokens,'blocks',r.blocks,'lists',r.lists,'exact',r.exact,(Date.now()-t0)+'ms');
}
