import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const T=(s:string)=>countTokens(s,enc);
// R1: after . , ; :  (space before non-whitespace)
function r1(text:string){
  const fold=text.replace(/([.,;:])(?=\S)/g,'$1\u0001');   // mark derivable positions (no space)
  // real fold = delete the space that FOLLOWS the mark
  const out=text.replace(/([.,;:]) (?=\S)/g,'$1');
  return {out, n:(text.match(/[.,;:] (?=\S)/g)||[]).length};
}
// R2: line-initial run of # * + - >
const MK='#*+->';
function r2(text:string){
  const lines=text.split('\n'); let n=0;
  const out=lines.map(ln=>{let i=0;while(i<ln.length&&MK.includes(ln[i]!))i++;
    if(i===0||ln[i]!==' ')return ln; n++; return ln.slice(0,i)+ln.slice(i+1);}).join('\n');
  return {out,n};
}
// R3: line-initial digits + . or ) then space
function r3(text:string){
  const lines=text.split('\n'); let n=0;
  const out=lines.map(ln=>{const m=ln.match(/^(\d+[.)]) (?=\S)/); if(!m)return ln; n++;
    return ln.slice(0,m[0].length-1)+ln.slice(m[0].length);}).join('\n');
  return {out,n};
}
const files=['bench/holdout/readme.txt','bench/z47/corpus/changelog/svenstaro_miniserve.md','bench/z46/corpus/traces/spring-projects_spring-framework_35118.md','bench/holdout-work/llm-answer.md','bench/holdout-work/kb-article.txt','bench/holdout-work/email-thread.txt','bench/holdout-work/bibliography.txt','bench/holdout-work/meeting-transcript.txt','bench/holdout-lang/de-kb.txt'];
console.log('lane                        raw    R1n  R1d |  R2n  R2d |  R3n  R3d | ALLd  (clause~22)');
for(const f of files){
  const t=fs.readFileSync(f,'utf8'); const raw=T(t);
  const a=r1(t); const b=r2(a.out); const c=r3(b.out);
  const d1=T(a.out)-raw, d2=T(b.out)-T(a.out), d3=T(c.out)-T(b.out);
  console.log(`${f.split('/').pop()!.padEnd(27)}${String(raw).padStart(5)} ${String(a.n).padStart(6)} ${String(d1).padStart(4)} | ${String(b.n).padStart(5)} ${String(d2).padStart(4)} | ${String(c.n).padStart(5)} ${String(d3).padStart(4)} | ${String(d1+d2+d3).padStart(5)}`);
}
