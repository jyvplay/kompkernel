import fs from 'node:fs';
import { pyknosisPlan } from '@/lib/omega/pyknosis';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const t=fs.readFileSync(process.env.LANE!, 'utf8');
const plan=pyknosisPlan(t,enc,{alphabet:process.env.ALPHA});
console.log('plan:',plan?{runs:plan.runs,chars:plan.chars,est:plan.estimated,marker:plan.marker}:null);
if(plan){
  const b:any=oikonomiaEncode(t,enc);
  const a:any=oikonomiaEncode(plan.text,enc);
  const ct=countTokens(' '+plan.clause,enc)-countTokens(' ',enc);
  console.log('base msg',b.messageTokens,'alt msg',a.messageTokens,'clause',ct,'altTotal',a.messageTokens+ct,
    'delta',a.messageTokens+ct-b.messageTokens);
  console.log('base winner',b.winner,'alt winner',a.winner);
}
