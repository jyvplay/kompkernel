import fs from 'node:fs';
import { heuresisEncode } from '@/lib/omega/heuresis';
import { chironDecoderPrompt, chironOpsUsed } from '@/lib/omega/chiron';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
console.log('lane'.padEnd(24),'raw'.padStart(6),'wire'.padStart(6),'SEARCH-TAX'.padStart(11),'REAL-CONTRACT'.padStart(14),'gap'.padStart(5));
for (const f of (process.env.LANES||'').split(',').filter(Boolean)){
  const t=fs.readFileSync(f,'utf8');
  const r:any=heuresisEncode(t,enc);
  const wire:string=r.wire;
  const full=countTokens(chironDecoderPrompt(wire),enc);
  const searchTax=full-countTokens(wire,enc);   // what sibyl's greedy pays
  const real=r.contract?countTokens(r.contract,enc):0;      // what is actually shipped
  console.log(f.split('/').pop()!.padEnd(24),String(countTokens(t,enc)).padStart(6),String(r.wireTokens).padStart(6),
    String(searchTax).padStart(11),String(real).padStart(14),String(searchTax-real).padStart(5));
  if(process.env.SHOW) console.log('   ops',JSON.stringify(chironOpsUsed(wire)),'\n   prompt:',JSON.stringify(chironDecoderPrompt(wire).slice(wire.length, wire.length+300)));
}
