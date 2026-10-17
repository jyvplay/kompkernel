import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
function greedyWrap(text:string,W:number):string{
  const out:string[]=[];
  for(const para of text.split('\n')){
    if(para.length<=W){out.push(para);continue;}
    let line='';
    for(const w of para.split(' ')){
      if(line===''){line=w;continue;}
      if((line+' '+w).length<=W) line+=' '+w; else {out.push(line);line=w;}
    }
    out.push(line);
  }
  return out.join('\n');
}
function unwrap(text:string):{flat:string,ok:boolean}|null{
  // every newline must be between two non-newline chars and surrounded by single spaces
  if(/(^|\n)[ \t]*\n/.test(text)) return null;         // blank lines
  if(text.includes('\r')) return null;
  const parts=text.split('\n');
  for(let i=0;i<parts.length-1;i++){ if(parts[i]!.endsWith(' ')||parts[i+1]!.startsWith(' ')) return null; }
  return {flat:parts.join(' '),ok:true};
}
const files=['bench/holdout-work/kb-article.txt','bench/holdout-work/llm-answer.md','bench/holdout-lang/de-kb.txt','bench/holdout-work/email-thread.txt','bench/holdout/readme.txt','bench/holdout-work/meeting-transcript.txt','bench/holdout-work/bibliography.txt','bench/holdout-tab/vix-daily-1990.csv','bench/holdout-tbl/psql-output.txt','bench/z47/corpus/changelog/svenstaro_miniserve.md','bench/z46/corpus/traces/spring-projects_spring-framework_35118.md'];
for(const f of files){
  const t=fs.readFileSync(f,'utf8');
  const raw=countTokens(t,enc);
  const u=unwrap(t);
  if(!u){console.log(`${f.split('/').pop()!.padEnd(34)} raw=${String(raw).padStart(4)} UNWRAP-REJECT`);continue;}
  const lens=t.split('\n').map(l=>l.length);
  const maxL=Math.max(...lens);
  let hit:number|null=null;
  for(let W=40;W<=200;W++){ if(greedyWrap(u.flat,W)===t){hit=W;break;} }
  const nl=t.split('\n').length-1;
  if(hit===null){console.log(`${f.split('/').pop()!.padEnd(34)} raw=${String(raw).padStart(4)} nl=${String(nl).padStart(3)} maxL=${String(maxL).padStart(3)} NO-EXACT-W (flat=${countTokens(u.flat,enc)})`);continue;}
  console.log(`${f.split('/').pop()!.padEnd(34)} raw=${String(raw).padStart(4)} nl=${String(nl).padStart(3)} W=${hit} flat=${String(countTokens(u.flat,enc)).padStart(4)} dTok=${countTokens(u.flat,enc)-raw}`);
}
