import fs from 'node:fs';
import { heuresisEncode } from '@/lib/omega/heuresis';
import { timemaEncode, timemaRoundTrip } from '@/lib/omega/timema';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const files=(process.env.F||'prose-01,prose-02,prose-05').split(',');
const lens=(process.env.L||'500,1000,1500,2000').split(',').map(Number);
console.log('file'.padEnd(11),'chars'.padStart(6),'raw'.padStart(6),'heur'.padStart(6),'timema'.padStart(7),'Δ'.padStart(4),'rules'.padStart(6),'ret%'.padStart(7));
let sh=0,st=0;
for(const f of files){
  const full=fs.readFileSync(`bench/x30/fresh/${f}.txt`,'utf8');
  for(const L of [...lens, full.length]){
    if(L>full.length) continue;
    const t=full.slice(0,L); const raw=countTokens(t,enc);
    const a:any=heuresisEncode(t,enc); const b:any=timemaEncode(t,enc);
    const ok=timemaRoundTrip(t,enc);
    sh+=a.messageTokens; st+=b.messageTokens;
    console.log(f.padEnd(11),String(L).padStart(6),String(raw).padStart(6),String(a.messageTokens).padStart(6),
      String(b.messageTokens).padStart(7),String(b.messageTokens-a.messageTokens).padStart(4),
      String(b.rules).padStart(6),(100*b.messageTokens/raw).toFixed(1).padStart(6)+'%',ok?'':'***MISMATCH');
  }
}
console.log(`\nTOTAL heur ${sh} timema ${st} Δ ${st-sh}`);
