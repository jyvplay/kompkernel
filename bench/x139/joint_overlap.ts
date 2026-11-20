/** X138 next test: freeze candidates, jointly add 4/8/16 dictionary entries,
 * compare overlap and concatenation with identical entries and search budget.
 * This is new search evidence for existing SYNAPHE, NOT a new decoder mechanic.
 */
import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {synapheTrial} from '../../src/lib/omega/synaphe';
import {CHIRON_SCRIPTS,chironInScript,chironDecode} from '../../src/lib/omega/chiron';
import {steliUndo} from '../../src/lib/omega/steli';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';
const defaultRows=[...fs.readFileSync('bench/x138/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l)).filter(a=>/kb-article|node-help|email-thread|llm-answer/.test(a.path)),...fs.readFileSync('bench/x138/receipts/heldout-baseline.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l))];
const rows=process.argv[2]?fs.readFileSync(process.argv[2],'utf8').trim().split('\n').map(l=>JSON.parse(l)):defaultRows;
for(const a of rows){
 const pre=['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n'].find(p=>a.message.startsWith(p+'§'));if(!pre)continue;
 const wire=a.message.slice(pre.length),end=wire.indexOf('¶'),tape=wire.slice(1,end),body=wire.slice(end+1),target=chironDecode(wire);
 const script=CHIRON_SCRIPTS.find(s=>chironInScript(s,tape.charCodeAt(0)))!;
 const words=[...target.matchAll(/[A-Za-z][A-Za-z'-]*/g)],counts=new Map<string,number>();
 for(let i=0;i<words.length;i++)for(let len=1;len<=4&&i+len<=words.length;len++){
  const start=words[i].index!,last=words[i+len-1],end=last.index!+last[0].length;
  const v=target.slice(start>0&&target[start-1]===' '?start-1:start,target[end]===' '?end+1:end);
  if(v.length<5||v.length>100||!/^[A-Za-z '-]+$/.test(v))continue;
  counts.set(v,(counts.get(v)??0)+1);
 }
 const phrases=[...counts].filter(([,n])=>n>=2).map(([v,n])=>({v,n,score:(n-1)*encode(v).length-2})).sort((a,b)=>b.score-a.score||a.v.localeCompare(b.v)).slice(0,16);
 const pool:string[]=[];for(let cp=script.lo;cp<script.hi;cp++){const g=String.fromCharCode(cp);if(!a.message.includes(g)&&!target.includes(g))pool.push(g);}
 pool.sort((a,b)=>encode(a).length-encode(b).length||a.charCodeAt(0)-b.charCodeAt(0));
 fs.appendFileSync('bench/x139/receipts/joint-candidates.jsonl',JSON.stringify({path:a.path,phrases,pool:pool.slice(0,16)})+'\n');
 for(const k of [0,4,8,16]){
  const added=phrases.slice(0,k).map((x,i)=>pool[i]+x.v).join('');const seed=pre+'§'+tape+added+'¶'+body;
  assert.equal(chironDecode(seed.slice(pre.length)),target);
  for(const overlap of [false,true]){const t=performance.now(),r=synapheTrial(seed,'o200k_base',overlap),ms=performance.now()-t;if(!r){console.log(JSON.stringify({path:a.path,k,overlap,eligible:false,ms}));continue;}
   assert.equal(encode(r.message).length,r.tokens);assert.equal(steliUndo(r.target),fs.readFileSync(a.path,'utf8'));
   console.log(JSON.stringify({path:a.path,k,overlap,A:a.tokens,B:r.tokens,delta:r.tokens-a.tokens,ms,sourceExact:true,message:r.message}));
  }
 }
}
