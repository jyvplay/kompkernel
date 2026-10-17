import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
function wrapPara(p:string,W:number):string{
  if(p.length<=W) return p;
  let line=''; const out:string[]=[];
  for(const w of p.split(' ')){
    if(line===''){line=w;continue;}
    if((line+' '+w).length<=W) line+=' '+w; else {out.push(line);line=w;}
  }
  out.push(line); return out.join('\n');
}
function tryUnwrap(textIn:string):{paras:string[],sep:string,nl:number}|null{
  const text = textIn.endsWith('\n') ? textIn.slice(0,-1) : textIn;
  if(text.includes('\r')) return null;
  const m=text.match(/^(.*?)(\n[ \t]*\n)(?=.)/s);
  const sep=m?m[2]!:'\n\n';
  const paras=text.split(/\n[ \t]*\n/);
  // reject if any paragraph separator differed from the canonical one
  let rebuilt=paras.join(sep); if(rebuilt!==text) return null;
  let nl=0; const flat:string[]=[];
  for(const p of paras){
    if(p==='') return null;
    const lines=p.split('\n');
    nl+=lines.length-1;
    for(let i=0;i<lines.length;i++){
      if(lines[i]!.startsWith(' ')||lines[i]!.endsWith(' ')) return null;
      if(lines[i]==='') return null;
    }
    flat.push(lines.join(' '));
  }
  return {paras:flat,sep,nl};
}
const files=['bench/holdout-work/kb-article.txt','bench/holdout-work/llm-answer.md','bench/holdout-lang/de-kb.txt','bench/holdout-work/email-thread.txt','bench/holdout/readme.txt','bench/holdout-work/meeting-transcript.txt','bench/holdout-work/bibliography.txt','bench/holdout-tab/vix-daily-1990.csv','bench/holdout-tbl/psql-output.txt','bench/z47/corpus/changelog/svenstaro_miniserve.md','bench/z46/corpus/traces/spring-projects_spring-framework_35118.md','bench/holdout-ops/git-log-fuller.txt','bench/holdout-mk/dump.sql'];
for(const f of files){
  const t=fs.readFileSync(f,'utf8');
  const raw=countTokens(t,enc);
  const u=tryUnwrap(t);
  if(!u||u.nl===0){console.log(`${f.split('/').pop()!.padEnd(36)} raw=${String(raw).padStart(5)} REJECT(nl=${u?u.nl:'-'})`);continue;}
  const flat=u.paras.join(u.sep)+(t.endsWith('\n')?'\n':'');
  const flatTok=countTokens(flat,enc);
  let hit:number|null=null;
  for(let W=30;W<=250;W++){ if(u.paras.map(p=>wrapPara(p,W)).join(u.sep)+(t.endsWith('\n')?'\n':'')===t){hit=W;break;} }
  if(hit===null){console.log(`${f.split('/').pop()!.padEnd(36)} raw=${String(raw).padStart(5)} nl=${String(u.nl).padStart(4)} flatTok=${String(flatTok).padStart(5)} d=${String(flatTok-raw).padStart(4)} NO-EXACT-W`);continue;}
  console.log(`${f.split('/').pop()!.padEnd(36)} raw=${String(raw).padStart(5)} nl=${String(u.nl).padStart(4)} W=${String(hit).padStart(3)} flatTok=${String(flatTok).padStart(5)} d=${String(flatTok-raw).padStart(4)} *** REVERSIBLE`);
}
