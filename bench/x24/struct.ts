import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { polytroposEncode } from '@/lib/omega/polytropos';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const files=['bench/holdout-mk/dump.sql','bench/holdout-mk/chart.svg','bench/z46/corpus/traces/spring-projects_spring-framework_35118.md','bench/holdout-ops/node-stacktraces.txt','bench/holdout/readme.txt','bench/z47/corpus/changelog/svenstaro_miniserve.md','bench/holdout-work/kb-article.txt','bench/holdout-work/llm-answer.md','bench/z11/fresh/ops-git-log-stat.txt','bench/z48/corpus/sp500-200.csv'];
console.log('lane                        raw  polyM | indentLines deepIndent indentTok | trailWS | blankRuns');
for(const f of files){
  const t=fs.readFileSync(f,'utf8'); const raw=T(t);
  const p:any=polytroposEncode(t,enc);
  const lines=t.split('\n');
  let ind=0, deep=0, indTok=0;
  for(const ln of lines){
    const m=ln.match(/^[ \t]+/); if(!m) continue;
    ind++; const L=m[0].length;
    if(L>=8) deep++;
    indTok+=T(m[0]);
  }
  const trail=(t.match(/[ \t]+\n/g)||[]).length;
  const blanks=(t.match(/\n[ \t]*\n[ \t]*\n/g)||[]).length;
  console.log(`${f.split('/').pop()!.padEnd(27)}${String(raw).padStart(5)} ${String(p.messageTokens).padStart(6)} | ${String(ind).padStart(11)} ${String(deep).padStart(10)} ${String(indTok).padStart(9)} | ${String(trail).padStart(7)} | ${String(blanks).padStart(9)}`);
}
