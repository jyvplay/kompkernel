import assert from 'node:assert/strict';
import {anakykliPlan,anakykliRestore,anakykliCuts,anakykliLineFold,anakykliLineRestore,anakykliDecode,anakykliKey,ANAKYKLI_LINE_KEY,anakykliFromFrontier} from '../../src/lib/omega/anakykli';
let checks=0;
for(const text of ['', 'a', '\n','a\nb\n','\na\n','a\r\nb\r\n','α🙂\nβ\n','e\u0301\nlast','literal §x¶y\nrest\n','↶⤴◊⟲\nx\n']){
 for(let cut=0;cut<=text.length;cut++){
  const p=anakykliPlan(text,cut);if(p){assert.equal(anakykliRestore(p.folded,p.marker),text);assert.equal(anakykliDecode(anakykliKey(p.marker)+p.folded,s=>s),text);checks+=2;}
 }
 const line=anakykliLineFold(text);if(line!==null){assert.equal(anakykliLineRestore(line),text);assert.equal(anakykliDecode(ANAKYKLI_LINE_KEY+line,s=>s),text);checks+=2;}
 for(const c of anakykliCuts(text)){assert.ok(c>0&&c<text.length);assert.equal(text[c-1],'\n');checks++;}
 // An identity parent cannot repay an added instruction on these small cases.
 assert.equal(anakykliFromFrontier(text,text,s=>s,s=>s),null);checks++;
}
for(const s of ['no marker','a↶b↶c']){assert.throws(()=>anakykliRestore(s,'↶'));checks++;}
assert.throws(()=>anakykliLineRestore('unterminated'));checks++;
assert.throws(()=>anakykliDecode('not declared',s=>s));checks++;
// Regression: marker exhaustion must not disable marker-free first-line mode.
const saturated='↶⤴◊⟲\nx\n';let calls=0;
const result=anakykliFromFrontier(saturated,'long baseline '.repeat(100),s=>{calls++;return s;},s=>s);
assert.equal(calls,1);checks++;
assert.ok(result);checks++;
assert.equal(anakykliDecode(result!.message,s=>s),saturated);checks++;
// Gate must reject a cheaper candidate whose parent decoder corrupts the bytes.
assert.equal(anakykliFromFrontier('a\nb\n','long baseline '.repeat(100),s=>s,()=> 'wrong\n'),null);checks++;
console.log(JSON.stringify({checks,scope:'constructed edge-case tests, not real-workload compression evidence'}));
