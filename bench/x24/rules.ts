import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { chironParseTape, CHIRON_SCRIPTS } from '@/lib/omega/chiron';
import { polytroposEncode } from '@/lib/omega/polytropos';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const files=['bench/holdout-work/kb-article.txt','bench/holdout-work/llm-answer.md','bench/holdout-work/email-thread.txt','bench/holdout/readme.txt','bench/holdout-work/bibliography.txt','bench/holdout-work/meeting-transcript.txt','bench/holdout-lang/de-kb.txt','bench/z48/corpus/sp500-200.csv','bench/holdout-tab/vix-daily-1990.csv','bench/holdout-tab/aapl-2014.csv','bench/z47/corpus/changelog/svenstaro_miniserve.md','bench/holdout-ops/find-listing.txt','bench/holdout-tbl/kubectl-get-pods.txt','bench/holdout-tbl/psql-output.txt','bench/holdout-mk/dump.sql'];
console.log('lane                        raw  polyM  rules  tapeTokens  (d = potential inline saving)');
let tot=0;
for(const f of files){
  const t=fs.readFileSync(f,'utf8'); const raw=T(t);
  const p:any=polytroposEncode(t,enc);
  const wire:string=p.wire; const pi=wire.indexOf('\u00b6');
  let tape=pi>=0?wire.slice(0,pi):'';
  if(tape.startsWith('\u00a7')) tape=tape.slice(1);   // strip CHIRON_START opener
  let d=0;
  for(const sc of CHIRON_SCRIPTS){ const r=chironParseTape(tape,sc); if(r&&r.length>d) d=r.length; }
  tot+=d;
  console.log(`${f.split('/').pop()!.padEnd(27)}${String(raw).padStart(5)} ${String(p.messageTokens).padStart(6)} ${String(d).padStart(6)} ${String(T(tape)).padStart(11)}`);
}
console.log('sum d =',tot);
