import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
// Derivable-space candidates in hybrid prose. R2: after a line-initial run of
// markdown markers, a space is forced.
const MARKERS='#*+->';
function analyse(text:string){
  const lines=text.split('\n');
  let derivable=0, danger=0;
  for(const ln of lines){
    let i=0; while(i<ln.length && MARKERS.includes(ln[i]!)) i++;
    if(i===0) continue;                       // no line-initial marker run
    if(ln[i]===' ') derivable++;
    else if(ln[i]!==undefined) danger++;      // marker run followed by non-space
  }
  const folded=lines.map(ln=>{
    let i=0; while(i<ln.length && MARKERS.includes(ln[i]!)) i++;
    if(i===0||ln[i]!==' ') return ln;
    return ln.slice(0,i)+ln.slice(i+1);
  }).join('\n');
  return {derivable,danger,folded,dTok:countTokens(folded,enc)-countTokens(text,enc)};
}
// R3: space after a closing ')' / ']' before a letter?  and '(' after a letter?
function paren(text:string){
  const m1=(text.match(/\)\s/g)||[]).length;      // ") "
  const d1=(text.match(/\)(?=[A-Za-z])/g)||[]).length;
  return {m1,d1};
}
const files=['bench/holdout/readme.txt','bench/z47/corpus/changelog/svenstaro_miniserve.md','bench/z46/corpus/traces/spring-projects_spring-framework_35118.md','bench/holdout-work/llm-answer.md','bench/holdout-work/kb-article.txt','bench/holdout-work/email-thread.txt','bench/holdout-work/bibliography.txt','bench/holdout-work/meeting-transcript.txt','bench/holdout-lang/de-kb.txt','bench/holdout-ops/git-numstat.txt','bench/holdout-ops/find-listing.txt'];
console.log('lane                        raw  R2deriv R2dang R2dTok  paren") " paren")X"');
for(const f of files){
  const t=fs.readFileSync(f,'utf8');
  const raw=countTokens(t,enc);
  const a=analyse(t); const p=paren(t);
  console.log(`${f.split('/').pop()!.padEnd(27)}${String(raw).padStart(5)} ${String(a.derivable).padStart(7)} ${String(a.danger).padStart(6)} ${String(a.dTok).padStart(6)} ${String(p.m1).padStart(9)} ${String(p.d1).padStart(9)}`);
}
