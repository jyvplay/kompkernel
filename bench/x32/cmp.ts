import fs from 'node:fs';
import { heuresisEncode } from '@/lib/omega/heuresis';
import { timemaEncode, timemaRoundTrip } from '@/lib/omega/timema';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
let th=0,tt=0,win=0,tot=0;
console.log('lane'.padEnd(30),'raw'.padStart(6),'heur'.padStart(6),'timema'.padStart(7),'Δ'.padStart(5),'rung'.padStart(8),'EXACT');
for (const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f)){console.log('skip',f);continue;}
  const t=fs.readFileSync(f,'utf8');
  const a:any=heuresisEncode(t,enc); const b:any=timemaEncode(t,enc);
  const ok=timemaRoundTrip(t,enc);
  const d=b.messageTokens-a.messageTokens;
  th+=a.messageTokens; tt+=b.messageTokens; tot++; if(d<0)win++;
  console.log(f.split('/').pop()!.padEnd(30),String(countTokens(t,enc)).padStart(6),
    String(a.messageTokens).padStart(6),String(b.messageTokens).padStart(7),
    String(d>0?'+'+d:d).padStart(5),(b.contractRungs.join(',')||'-').padStart(8),ok);
}
console.log(`\nTOTAL heur ${th}  timema ${tt}  Δ ${tt-th}   lanes improved ${win}/${tot}`);
