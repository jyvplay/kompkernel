import fs from 'node:fs';import assert from 'node:assert/strict';import {klimaxPlan,klimaxUndo,klimaxRead,klimaxFromFrontier,klimaxCandidate,KLIMAX_KEY} from '../../src/lib/omega/klimax';
let checks=0,state=159;const rnd=()=>state=(Math.imul(state,1664525)+1013904223)>>>0,pairs:any[]=[];
for(let k=0;k<600;k++){
 let v=[1],s='1. Root\n';for(let i=0;i<40;i++){
  const mode=rnd()%5;if(mode===0&&v.length<12)v.push(1);else if(mode===1&&v.length>1){v.pop();v[v.length-1]++;}else if(mode===2)v=[1+rnd()%15,1+rnd()%7];else v[v.length-1]++;
  const lead=['','   ','## ','  #### '][rnd()%4],tail=[' Heading','\tDetails 😀',' Title\r',''][rnd()%4];s+=lead+v.join('.')+(rnd()%2?'.':'')+tail+'\n';
  if(rnd()%7===0)s+='ordinary text 1.7.3 not at start\n';
 }if(rnd()%2)s=s.slice(0,-1);const p=klimaxPlan(s);assert.ok(p);assert.equal(klimaxUndo(p.folded),s);assert.equal(klimaxRead(KLIMAX_KEY+p.folded,x=>x),s);checks+=3;if(k<100)pairs.push({source:s,...p});
}
for(const s of ['@2 x','  ## @1. x','1. x\n1.1. y\n@2 x','\ud800','x'.repeat(50001)]){assert.equal(klimaxPlan(s),null);checks++;}
for(const s of ['@2 x','1. a\n@3 b','@0 x','@13 x','@01 x','@1x','999999. x\n@1 y']){assert.throws(()=>klimaxUndo(s));checks++;}
for(const s of ['01.2 literal\n01.3 literal','1.0 literal\n1.01 literal','\t1.1 not-admitted','1.2.3.4.5.6.7.8.9.10.11.12.13 too deep','1000000.1 too large']){assert.equal(klimaxUndo(s),s);checks++;}
const patchSource='1.\r\n01.9 invalid\r\n0.8 invalid\r\n1000000.1 invalid\r\n1.1.\r\n1.2.\r\n';const patchPlan=klimaxPlan(patchSource)!;assert.ok(patchPlan);assert.equal(klimaxUndo(patchPlan.folded),patchSource);assert.ok(patchPlan.folded.includes('@2.\r\n'));checks+=3;pairs.push({source:patchSource,...patchPlan});
const seed='1. a\n1.1 b\n1.2 c\n2. d\n2.1 e\n2.1.1 f\n2.2 g\n';const p=klimaxPlan(seed)!;assert.equal(klimaxUndo(p.folded),seed);checks++;assert.equal(klimaxCandidate(seed,'wrong',s=>s),null);checks++;assert.throws(()=>klimaxFromFrontier(seed,'wrong',s=>s,s=>s,s=>s));checks++;assert.equal(klimaxFromFrontier(seed,seed,s=>s,()=>{throw Error('parent failure')},s=>s).message,seed);checks++;
for(const r of JSON.parse(fs.readFileSync('bench/x159/receipts/screen.json','utf8'))){if(!r.folded)continue;assert.equal(klimaxUndo(r.folded),fs.readFileSync(r.path,'utf8'));checks++;}
assert.throws(()=>klimaxUndo('1.1.1.1.1.1.1.1.1.1.1.1 x\n'+'@12 x\n'.repeat(8000)));checks++;
fs.writeFileSync('bench/x159/receipts/unit-pairs.json',JSON.stringify(pairs));fs.writeFileSync('bench/x159/receipts/unit.json',JSON.stringify({checks,passed:true,generatedCases:600,seed:159,native:false},null,2));console.log({checks});
