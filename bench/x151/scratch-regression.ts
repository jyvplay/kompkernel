import assert from 'node:assert/strict';
import {prepareRuns,prepareRunCostState,scoreRunCostDelta,scoreRunCostDeltaSlots,commitRunCostDeltaSlots,commitRunCostDelta,runCostPrepared} from '../../src/lib/omega/ariadne';
let checks=0;
for(const n of [0,1,65535,65536,65537,70000,3]){
 const p=prepareRuns(Array.from({length:n},(_,i)=>[0,i+1,0]));const refs=Array.from({length:n+1},(_,i)=>i),before=refs.map((_,i)=>i?'b':'a'),after=before.slice();after[0]='🚀';const enc='o200k_base' as const,cache=new Map<string,number>();
 const expected=runCostPrepared(p,new Map(refs.map(i=>[i,after[i]!])),enc,cache);
 for(const slots of [false,true]){
  const state=prepareRunCostState(p,refs,before,enc,cache);
  if(slots){const delta=scoreRunCostDeltaSlots(p,state,after,[0,0],enc,cache);assert.equal(delta.total,expected);commitRunCostDeltaSlots(state,delta)}
  else {const delta=scoreRunCostDelta(p,state,before,after,enc,cache);assert.equal(delta.total,expected);commitRunCostDelta(state,delta)}
  const fresh=prepareRunCostState(p,refs,after,enc,cache);assert.deepEqual(state.costs,fresh.costs);assert.equal(state.total,fresh.total);checks+=3;
  const noop=scoreRunCostDeltaSlots(p,state,after,[],enc,cache);assert.equal(noop.total,expected);assert.equal(noop.n,0);checks+=2;
 }
}
console.log(JSON.stringify({checks,passed:true,scope:'both scorers, capacity boundaries, duplicate slots, commit costs, no-op, large then small'}));
