import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
function wrapPara(p:string,W:number):string{
  if(p.length<=W) return p;
  let line=''; const out:string[]=[];
  for(const w of p.split(' ')){
    if(line===''){line=w;continue;}
    if((line+' '+w).length<=W) line+=' '+w; else {out.push(line);line=w;}
  }
  out.push(line); return out.join('\n');
}
// Count, for the best W, how many LINE BREAKS differ between greedy-wrap and original.
function best(text:string){
  const trail=text.endsWith('\n'); const body=trail?text.slice(0,-1):text;
  if(body.includes('\r')) return null;
  const paras=body.split(/\n[ \t]*\n/);
  if(paras.join('\n\n')!==body) return null;
  const flat=paras.map(p=>p.split('\n').filter(l=>l!==''&&!l.startsWith(' ')).join(' '));
  if(flat.some((p,i)=>p!==paras[i]!.split('\n').join(' '))) return null;
  let bestW:number|null=null,bestDiff=1e9,bestNl=0;
  for(let W=30;W<=250;W++){
    const rebuilt=flat.map(p=>wrapPara(p,W)).join('\n\n')+(trail?'\n':'');
    if(rebuilt===text) return {W,diff:0,nl:body.split('\n').length-paras.length+ (paras.length-1)};
    // count differing line-break positions
    const a=body.split('\n'), b=flat.map(p=>wrapPara(p,W)).join('\n\n').split('\n');
    let diff=0; const m=new Set(b.map(l=>l.length));
    // cheap proxy: number of original lines whose length is not explainable
    for(const l of a) if(l.length>W+40) diff++;
    if(diff<bestDiff){bestDiff=diff;bestW=W;bestNl=a.length;}
  }
  return {W:bestW,diff:bestDiff,nl:bestNl};
}
const files=['bench/holdout-work/kb-article.txt','bench/holdout-work/llm-answer.md','bench/holdout-work/email-thread.txt','bench/holdout-work/bibliography.txt','bench/holdout-work/meeting-transcript.txt','bench/holdout-lang/de-kb.txt','bench/holdout/readme.txt'];
for(const f of files){
  const t=fs.readFileSync(f,'utf8'); const raw=T(t);
  const r=best(t);
  if(!r){console.log(`${f.split('/').pop()!.padEnd(24)} raw=${String(raw).padStart(4)} REJECT`);continue;}
  // exact-wrap check
  const trail=t.endsWith('\n'); const body=trail?t.slice(0,-1):t;
  const paras=body.split(/\n[ \t]*\n/);
  const flat=paras.map(p=>p.split('\n').join(' '));
  const rebuilt=flat.map(p=>wrapPara(p,r.W!)).join('\n\n')+(trail?'\n':'');
  const nl=body.split('\n').length-paras.length;
  const flatTok=T(flat.join('\n\n')+(trail?'\n':''));
  console.log(`${f.split('/').pop()!.padEnd(24)} raw=${String(raw).padStart(4)} nl=${String(nl).padStart(3)} bestW=${String(r.W).padStart(3)} exact=${rebuilt===t} flatTok=${String(flatTok).padStart(4)} dTok=${String(flatTok-raw).padStart(4)}`);
}
