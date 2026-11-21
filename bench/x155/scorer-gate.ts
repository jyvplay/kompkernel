import fs from 'node:fs';import assert from 'node:assert/strict';import {prepareRuns,prepareRunCostState,scoreRunCostDelta,scoreRunCostDeltaSlots,commitRunCostDelta,commitRunCostDeltaSlots} from '../../src/lib/omega/ariadne';import {encode as refO} from 'gpt-tokenizer/encoding/o200k_base';import {encode as refC} from 'gpt-tokenizer/encoding/cl100k_base';
let checks=0;const rows=[];let seed=155;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
const chars=['a','b',' ', '\0','Ж','я','ا','界','\ud800','\udc00','🚀','multi',''];
for(const enc of ['o200k_base','cl100k_base'] as const)for(let trial=0;trial<500;trial++){
 const refs=[0,1,2,3,4,5,6,7],before=refs.map(()=>chars[rand()%chars.length]),after=[...before],changed=[rand()%8,rand()%8];for(const i of changed)after[i]=chars[rand()%chars.length];
 const runs=Array.from({length:40},()=>Array.from({length:1+rand()%4},()=>rand()%8)),p=prepareRuns([...runs,...runs.slice(0,12)]),cache=new Map<string,number>(),a=prepareRunCostState(p,refs,before,enc,cache),b=prepareRunCostState(p,refs,before,enc,cache),limit=trial%3===0?Infinity:a.total+(trial%11)-5;
 const ref=scoreRunCostDelta(p,a,before,after,enc,cache,limit),got=scoreRunCostDeltaSlots(p,b,after,changed,enc,cache,limit);assert.equal(ref.total<=limit,got.total<=limit);checks++;
 if(got.total<=limit){commitRunCostDeltaSlots(b,got);commitRunCostDelta(a,ref);assert.equal(b.total,a.total);assert.deepEqual(b.costs,a.costs);const encode=enc==='o200k_base'?refO:refC;assert.equal(b.total,p.pats.reduce((sum,run,i)=>sum+encode(run.map(j=>after[j]).join('')).length*p.mult[i],0));checks+=3;}
 rows.push({enc,accepted:got.total<=limit,total:got.total<=limit?got.total:null});
}
console.log(JSON.stringify({checks,passed:true,rows}));
