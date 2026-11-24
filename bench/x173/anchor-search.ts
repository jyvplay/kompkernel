/** Exact Cartesian anchor-placement search within a declared <=4-word,
 * <=6-occurrences/word subspace. NOT global parent-price optimization. */
import fs from 'node:fs';import assert from 'node:assert/strict';import {encode} from 'gpt-tokenizer/encoding/o200k_base';import {ichnosPlans,ichnosUndo,ICHNOS_KEY} from '../../src/lib/omega/ichnos';
const paths=fs.readFileSync('bench/x173/lanes.txt','utf8').trim().split('\n');const rows=[];let checks=0;
for(const path of paths){const source=fs.readFileSync(path,'utf8'),p=ichnosPlans(source)[0];if(!p){rows.push({path,status:'no ICHNOS plan'});continue;}
 const words=source.match(/[A-Za-z]+/g)??[],encoded=p.folded.match(/~[A-Za-z]+|[A-Za-z]+/g)??[];assert.equal(words.length,encoded.length);const refs=new Map<string,string>(),positions=new Map<string,number[]>();words.forEach((w,i)=>{if(!positions.has(w))positions.set(w,[]);positions.get(w)!.push(i);if(encoded[i].startsWith('~'))refs.set(w,encoded[i]);});
 const selected=[...refs.keys()].filter(w=>positions.get(w)!.length<=6).slice(0,4);let best={folded:p.folded,tokens:encode(ICHNOS_KEY+p.folded).length},evaluations=0;const choices=new Map<string,number>();
 function visit(at:number){if(at<selected.length){const w=selected[at];for(const i of positions.get(w)!){choices.set(w,i);visit(at+1);}return;}
  let i=0;const folded=source.replace(/[A-Za-z]+/g,w=>{const j=i++;return choices.has(w)?(choices.get(w)===j?w:refs.get(w)!):encoded[j];});assert.equal(ichnosUndo(folded),source);checks++;evaluations++;const tokens=encode(ICHNOS_KEY+folded).length;if(tokens<best.tokens)best={folded,tokens};}
 visit(0);assert.ok(best.tokens<=p.tokens);checks++;rows.push({path,selected,subspaceSize:selected.reduce((n,w)=>n*positions.get(w)!.length,1),evaluations,before:p.tokens,after:best.tokens,folded:best.folded,message:ICHNOS_KEY+best.folded,scope:'Exact within fixed anchor variables and fixed reference spellings; complete direct price, not parent price'});
}
fs.writeFileSync('bench/x173/receipts/anchor-search.json',JSON.stringify({checks,rows},null,2));console.log({checks,improved:rows.filter((r:any)=>r.after<r.before).map((r:any)=>({path:r.path,saved:r.before-r.after}))});
