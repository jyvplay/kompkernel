import fs from 'node:fs';
import { timemaEncode, timemaRoundTrip } from '@/lib/omega/timema';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const files=[
 'bench/x30/fresh/prose-01.txt','bench/x30/fresh/prose-03.txt','bench/x30/fresh/prose-07.txt','bench/x30/fresh/prose-11.txt',
 'bench/holdout-work/kb-article.txt','bench/holdout/readme.txt','bench/holdout-work/email-thread.txt',
 'bench/holdout-ops/ls-full-iso.txt','bench/holdout-ops/node-stacktraces.txt','bench/holdout-tbl/kubectl-get-pods.txt',
 'bench/holdout-tab/vix-daily-1990.csv','bench/holdout-mk/dump.sql','bench/holdout-lang/de-kb.txt','bench/holdout-work/llm-answer.md',
];
let ok=0,tot=0;
for(const f of files){
  if(!fs.existsSync(f)){console.log('skip',f);continue;}
  const t=fs.readFileSync(f,'utf8'); const t0=Date.now();
  const r:any=timemaEncode(t,enc); const ms=Date.now()-t0;
  const exact=timemaRoundTrip(t,enc); tot++; if(exact)ok++;
  console.log(f.split('/').pop()!.padEnd(28),'raw',String(countTokens(t,enc)).padStart(5),
    'timema',String(r.messageTokens).padStart(5),'contract',String(r.parentContractTokens+'->'+(r.messageTokens-r.wireTokens)).padStart(8),
    'rungs',(r.contractRungs.join(',')||'-').padEnd(18),(ms/1000).toFixed(0)+'s','EXACT',exact);
}
console.log(`\nBYTE-PERFECT: ${ok}/${tot}`);
