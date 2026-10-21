import fs from 'node:fs';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { pyknosisPlan } from '@/lib/omega/pyknosis';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const N=Number(process.env.N||3);
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const base:number[]=[], alt:number[]=[];
  const plan=pyknosisPlan(t,enc);
  for(let i=0;i<N;i++){ const r:any=oikonomiaEncode(t,enc); base.push(r.messageTokens); }
  if(plan) for(let i=0;i<N;i++){ const r:any=oikonomiaEncode(plan.text,enc); alt.push(r.messageTokens+17); }
  console.log(f.split('/').pop()!.padEnd(26),'planRuns',plan?plan.runs:0,'planChars',plan?plan.chars:0,'planEst',plan?plan.estimated:0);
  console.log('   base encodes      ',JSON.stringify(base));
  if(plan) console.log('   transformed(+17)  ',JSON.stringify(alt),' -> deltas',JSON.stringify(alt.map(a=>a-Math.min(...base))));
}
