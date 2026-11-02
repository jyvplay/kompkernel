import assert from 'node:assert/strict';
import {diorthosiDecode,diorthosiPlan,DIORTHOSI_HEADER} from '../../src/lib/omega/diorthosi';
import {writeFileSync} from 'node:fs';
let seed=0x96523; function rnd(n:number) { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed%n; }
const alphabet=['a',' ','\r','\t','😀','漢','"','\\','\u0000','\ud800','\udc00','---'];
for(let trial=0; trial<1000; trial++) {
 const lines=Array.from({length:3+rnd(8)},()=>Array.from({length:rnd(18)},()=>alphabet[rnd(alphabet.length)]).join(''));
 const docs=[lines.join('\n')];
 for(let j=0;j<2+rnd(8);j++) { const b=lines.slice(); for(let k=0;k<rnd(4);k++) b[rnd(b.length)]=alphabet[rnd(alphabet.length)]+rnd(100); docs.push(b.join('\n')); }
 const source=docs.join('\n---\n'), plan=diorthosiPlan(source);
 if(plan!==null) assert.equal(diorthosiDecode(plan),source);
}
assert.equal(diorthosiPlan('a\n---\nb'),null);
assert.equal(diorthosiPlan('a\nb\nc\n---\na\nb\n---\na\nb\nc'),null);
for(const bad of [ ['\n---\n',['x'],[[[-1,'a']]]], ['x',['a'],[[[0,'b'],[0,'c']]]], ['x',['a'],[[[1,'x']]]], ['x',['a'],[[[0,7]]]] ]) assert.throws(()=>diorthosiDecode(DIORTHOSI_HEADER+'\n'+JSON.stringify(bad)));
const receipt={seed:'0x96523',trials:1000,malformedCases:4,result:'pass'};
writeFileSync('bench/x69/unit-receipt.json',JSON.stringify(receipt,null,2)+'\n'); console.log(receipt);
