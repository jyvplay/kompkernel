import fs from 'node:fs';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
const enc='o200k_base' as any;
const B=(process.env.BUDGETS||'2000,20000').split(',').map(Number);
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const out:string[]=[];
  for(const b of B){
    const r:any=oikonomiaEncode(t,enc,{budgetMs:b} as any);
    out.push(`${b}ms:${r.messageTokens}`);
  }
  console.log(f.split('/').pop()!.padEnd(24),out.join('  '));
}
