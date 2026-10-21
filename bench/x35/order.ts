import fs from 'node:fs';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { pyknosisPlan } from '@/lib/omega/pyknosis';
const enc='o200k_base' as any;
const f=process.env.LANE!;
const t=fs.readFileSync(f,'utf8');
const plan=pyknosisPlan(t,enc);
console.log('plan',plan?{runs:plan.runs,chars:plan.chars}:null);
const seq=process.env.SEQ||'B,A,B,A';
const out:string[]=[];
for(const step of seq.split(',')){
  const src = step==='B' ? t : plan!.text;
  const r:any=oikonomiaEncode(src,enc);
  const add = step==='B' ? 0 : 17;
  out.push(`${step}=${r.messageTokens+add}`);
}
console.log('SEQ',seq,'->',out.join('  '));
