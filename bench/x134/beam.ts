/** Reuse the existing VELTISTOS parser for cooperative alias choices. */
import * as fs from 'node:fs';
import {countTokens} from '../../src/lib/omega/bpe';
import {CHIRON_SCRIPTS,chironInScript,chironParseTape,chironDecode} from '../../src/lib/omega/chiron';
import {buildTape} from '../../src/lib/omega/euros';
import {veltistosParse} from '../../src/lib/omega/veltistos';
const ct=(s:string)=>countTokens(s,'o200k_base');
for(const line of fs.readFileSync('bench/x134/receipts/frontier.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(line),m=a.message as string,at=m.indexOf('§'),end=m.indexOf('¶',at);if(at<0||end<0)continue;
 const tape=m.slice(at+1,end),script=CHIRON_SCRIPTS.find(s=>tape.length&&chironInScript(s,tape.codePointAt(0)!));
 if(!script||!['cyrillic','arabic'].includes(script.name))continue;
 const rs0=chironParseTape(tape,script);if(!rs0)continue;
 const rules=rs0.map(r=>({g:r.glyph,v:r.raw})),body=m.slice(end+1),pre=m.slice(0,at),target=chironDecode(m.slice(at));
 const used=new Set([...a.text,...m]),pool=Array.from({length:script.hi-script.lo},(_,i)=>String.fromCodePoint(script.lo+i)).filter(h=>!used.has(h));
 const t=Date.now(),ranked:any[]=[];
 for(const r of rules){
  const positions:number[]=[];for(let i=0;i<body.length;i++)if(body[i]===r.g)positions.push(i);
  if(positions.length<2)continue;
  for(const h of pool){let score=0;for(const p of positions){const lo=Math.max(0,p-12),hi=Math.min(body.length,p+13);score+=Math.min(0,ct(body.slice(lo,p)+h+body.slice(p+1,hi))-ct(body.slice(lo,hi)));}
   if(score<0)ranked.push({g:r.g,h,score});
  }
 }
 ranked.sort((a,b)=>a.score-b.score);
 let best=m,nt=ct(m),chosen:any=null;let parses=0,edges=0;
 for(const c of ranked.slice(0,64)){
  const rs=[...rules,{g:c.h,v:c.g}],prefix=pre+buildTape(rs)+'¶';
  const budget={edges:0,capped:false};const b=veltistosParse(body,[{g:c.h,v:c.g}],24,8,'¶','o200k_base',budget);edges+=budget.edges;parses++;
  if(b===null)continue;const candidate=prefix+b,n=ct(candidate);
  if(n<nt&&chironDecode(candidate.slice(at))===target){best=candidate;nt=n;chosen=c;}
 }
 console.log(JSON.stringify({path:a.path,A:a.tokens,B:nt,delta:nt-a.tokens,ms:Date.now()-t,parses,edges,chosen}));
}
