import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
import {polytroposEncode} from '@/lib/omega/polytropos';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
for(const f of ['bench/holdout-work/kb-article.txt','bench/z48/corpus/sp500-200.csv','bench/holdout-work/meeting-transcript.txt']){
  const t=fs.readFileSync(f,'utf8');
  const p:any=polytroposEncode(t,enc);
  const w=String(p.wire); const c=String(p.decoderPrompt).slice(w.length+1);
  console.log('='.repeat(70));
  console.log(f.split('/').pop(),'| wireTok',T(w),'| contractTok',T(c));
  console.log(JSON.stringify(c));
}
