import fs from 'node:fs';
import { timemaEncode, timemaRoundTrip } from '@/lib/omega/timema';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const all=[
 'bench/holdout-mk/dump.sql','bench/holdout-ops/find-listing.txt','bench/holdout-ops/git-log-fuller.txt',
 'bench/z20/samples/git-log-iso.txt','bench/holdout-ops/git-numstat.txt','bench/holdout-ops/ls-full-iso.txt',
 'bench/holdout-ops/node-stacktraces.txt','bench/z11/fresh/ops-git-log-stat.txt','bench/z57/lanes/ops-ls-l-bin.txt',
 'bench/z57/lanes/ops-ls-l-omega.txt','bench/holdout-ops/openstack-loghub-26.log','bench/holdout-mk/chart.svg',
 'bench/holdout-tbl/df-h.txt','bench/holdout-tbl/kubectl-get-pods.txt','bench/holdout-tbl/psql-output.txt',
 'bench/holdout-work/bibliography.txt','bench/holdout-lang/de-kb.txt','bench/holdout-work/email-thread.txt',
 'bench/holdout-work/kb-article.txt','bench/holdout-work/llm-answer.md','bench/holdout-work/meeting-transcript.txt',
 'bench/holdout/readme.txt','bench/z46/corpus/traces/spring-projects_spring-framework_35118.md',
 'bench/z47/corpus/changelog/svenstaro_miniserve.md','bench/holdout-tab/aapl-2014.csv','bench/z11/fresh/csv-8.csv',
 'bench/z48/corpus/sp500-200.csv','bench/holdout-tab/vix-daily-1990.csv',
];
const i0=Number(process.env.I0||0), i1=Number(process.env.I1||all.length);
let tot=0,raw=0;
for(const f of all.slice(i0,i1)){
  if(!fs.existsSync(f)){console.log('MISSING',f);continue;}
  const t=fs.readFileSync(f,'utf8');
  const r:any=timemaEncode(t,enc); const ok=timemaRoundTrip(t,enc);
  const rt=countTokens(t,enc); raw+=rt; tot+=r.messageTokens;
  console.log(f.padEnd(58),'raw',String(rt).padStart(5),'timema',String(r.messageTokens).padStart(5),
    (100*r.messageTokens/rt).toFixed(1).padStart(6)+'%','rules',String(r.rules).padStart(3),ok?'EXACT':'***MISMATCH');
}
console.log(`SUBTOTAL raw ${raw} timema ${tot}`);
