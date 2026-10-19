import fs from 'node:fs';
import { timemaEncode, timemaRoundTrip } from '@/lib/omega/timema';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const all=[
 'bench/holdout-ops/openstack-loghub-26.log','bench/holdout-mk/chart.svg','bench/holdout-tbl/df-h.txt',
 'bench/holdout-tbl/kubectl-get-pods.txt','bench/holdout-tbl/psql-output.txt','bench/holdout-work/bibliography.txt',
 'bench/holdout-lang/de-kb.txt','bench/holdout-work/email-thread.txt','bench/holdout-work/kb-article.txt',
 'bench/holdout-work/llm-answer.md','bench/holdout-work/meeting-transcript.txt','bench/holdout/readme.txt',
 'bench/holdout-tab/aapl-2014.csv','bench/z11/fresh/csv-8.csv','bench/z48/corpus/sp500-200.csv',
 'bench/holdout-tab/vix-daily-1990.csv','bench/holdout-ops/npm-ls.txt','bench/x30/fresh/prose-01.txt',
 'bench/x30/fresh/prose-05.txt','bench/x30/fresh/prose-09.txt',
];
const out=fs.createWriteStream('/home/user/kompkernel/bench/x32/frontier.jsonl',{flags:'a'});
for(const f of all){
  if(!fs.existsSync(f)){ console.log('MISSING '+f); continue; }
  const t=fs.readFileSync(f,'utf8');
  const t0=Date.now();
  const r:any=timemaEncode(t,enc);
  const ok=timemaRoundTrip(t,enc);
  const rt=countTokens(t,enc);
  out.write(JSON.stringify({lane:f,raw:rt,timema:r.messageTokens,rules:r.rules,ms:Date.now()-t0,exact:ok})+'\n');
  console.log(f.padEnd(56),'raw',String(rt).padStart(5),'timema',String(r.messageTokens).padStart(5),
    (100*r.messageTokens/rt).toFixed(1).padStart(6)+'%',ok?'EXACT':'***MISMATCH');
}
out.end();
console.log('DONE');
