import { heuresisRoundTrip, heuresisEncode } from '@/lib/omega/heuresis';
import fs from 'node:fs';
const enc='o200k_base' as any;
const files=['bench/holdout-ops/find-listing.txt','bench/holdout/readme.txt','bench/holdout-work/kb-article.txt','bench/holdout-ops/ls-full-iso.txt','bench/holdout-tab/vix-daily-1990.csv','bench/holdout-lang/de-kb.txt','bench/x30/fresh/prose-05.txt','bench/holdout-work/llm-answer.md'];
let ok=0;
for(const f of files){ if(!fs.existsSync(f)){console.log('skip',f);continue;}
  const t=fs.readFileSync(f,'utf8'); const r=heuresisRoundTrip(t,enc); const e=heuresisEncode(t,enc);
  console.log(f.split('/').pop()!.padEnd(28),'tries',e.scriptTries,'msg',String(e.messageTokens).padStart(5),'EXACT',r); if(r)ok++; }
console.log('byte-perfect:',ok+'/'+files.length);
