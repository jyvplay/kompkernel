import fs from 'node:fs';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_SEP } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const r:any=oikonomiaEncode(t,enc);
  const w=String(r.wire); const cut=w.indexOf(CHIRON_SEP);
  const tape=w.slice(cut+1);
  console.log('='.repeat(70));
  console.log(f.split('/').pop(),'| wire',r.messageTokens,'| tapeTok',countTokens(tape,enc),'| tapeCh',tape.length,
    '| cpt',(tape.length/countTokens(tape,enc)).toFixed(2));
  console.log('--- TAPE (first 1100 chars):');
  console.log(JSON.stringify(tape.slice(0,1100)).slice(1,-1));
}
