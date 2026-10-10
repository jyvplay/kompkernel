/** Does wire cost keep falling as we add MORE word rules? (merge density effect) */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { sibylEncode } from '../src/lib/omega/sibyl';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);

// one-token glyph pool: cyrillic first (densest merges), then polyglot ranges
function pool(): string[] {
  const out:string[]=[]; const ranges:Array<[number,number]>=[[0x0400,0x0500],[0x0370,0x0400],[0x0530,0x0590],[0x0590,0x0600],[0x0900,0x0980],[0x0980,0x0a00],[0x0a00,0x0a80],[0x0a80,0x0b00],[0x0b80,0x0c00],[0x0c00,0x0c80],[0x0c80,0x0d00],[0x0d00,0x0d80],[0x0d80,0x0e00],[0x0e00,0x0e80],[0x10a0,0x1100]];
  for(const [a,b] of ranges) for(let cp=a;cp<b;cp++){const c=String.fromCodePoint(cp); if(T(c)===1) out.push(c);}
  return out;
}
const POOL=pool();
console.log('pool size', POOL.length);

function wordUnits(t:string): string[] {
  // split into o200k-ish atoms: optional single leading non-letter + letters, else single char
  return t.match(/[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}|\s+|[^\s\p{L}\p{N}]+/gu) ?? [];
}

function build(t:string, K:number, inPlace:boolean){
  const units=wordUnits(t);
  const freq=new Map<string,number>();
  for(const u of units){ if(!/\p{L}/u.test(u)) continue; freq.set(u,(freq.get(u)??0)+1); }
  const ranked=[...freq.entries()].filter(([w,c])=>c>=2).sort((a,b)=>(b[1]*T(b[0]))-(a[1]*T(a[0]))).slice(0,Math.min(K,POOL.length));
  const g=new Map<string,string>(); ranked.forEach(([w],i)=>g.set(w,POOL[i]));
  const seen=new Set<string>();
  let body='';
  for(const u of units){
    const gl=g.get(u);
    if(gl===undefined){ body+=u; continue; }
    if(inPlace && !seen.has(u)){ seen.add(u); body+=u+gl; continue; }
    body+=gl;
  }
  const tape = inPlace ? '' : '§'+ranked.map(([w],i)=>POOL[i]+w).join('')+'¶';
  return { wire: tape+body, rules: ranked.length, tapeTok: T(tape), bodyTok: T(body) };
}

const files:Array<[string,string]>=[];
for (const f of ['kb-article.txt','llm-answer.md','email-thread.txt','meeting-transcript.txt','bibliography.txt'])
  files.push(['work/'+f, fs.readFileSync('bench/holdout-work/'+f,'utf8')]);
for (const f of ['gh-prose.txt','license.txt','readme.txt','md-vite.txt','lic-mit.txt','md-react.txt'])
  files.push(['ho/'+f, fs.readFileSync('bench/holdout/'+f,'utf8')]);

const Ks=[10,20,40,80,150,300,600,800];
for (const [n,t] of files){
  const raw=T(t);
  let sib=raw; try{const r=sibylEncode(t,ENC,{budgetMs:3000}); if(r.decoded===t) sib=r.messageTokens;}catch{}
  const rowT:string[]=[], rowI:string[]=[];
  let bestT=1e9,bestI=1e9,bkT=0,bkI=0;
  for(const K of Ks){
    const a=build(t,K,false), b=build(t,K,true);
    const at=T(a.wire), bt=T(b.wire);
    rowT.push(`${K}:${at}`); rowI.push(`${K}:${bt}`);
    if(at<bestT){bestT=at;bkT=K;} if(bt<bestI){bestI=bt;bkI=K;}
  }
  console.log(`\n${n} raw=${raw} SIBYLmsg=${sib}`);
  console.log('  tape-wire   ', rowT.join(' '), ` best=${bestT}@K=${bkT}`);
  console.log('  inplace-wire', rowI.join(' '), ` best=${bestI}@K=${bkI}`);
  console.log(`  => tape+40ctr=${bestT+40}  inplace+22ctr=${bestI+22}  vs SIBYL ${sib}`);
}
