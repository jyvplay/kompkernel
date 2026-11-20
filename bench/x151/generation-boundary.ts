// The adjacent build script injects a near-overflow initial state into the
// unchanged production module; the scorer and all other code are unmodified.
import {prepareRuns,prepareRunCostState,scoreRunCostDeltaSlots,runCostPrepared} from '../../src/lib/omega/ariadne';
const p=prepareRuns([[0,1],[0,1,0],[0],[2]]),before=['a','b','c'],after=['🚀','🐈','c'],enc='o200k_base' as const,cache=new Map<string,number>();
const state=prepareRunCostState(p,[0,1,2],before,enc,cache),expected=runCostPrepared(p,new Map([[0,after[0]!],[1,after[1]!],[2,after[2]!]]),enc,cache);
const a=scoreRunCostDeltaSlots(p,state,after,[0,1],enc,cache),b=scoreRunCostDeltaSlots(p,state,after,[0,1],enc,cache);
console.log(JSON.stringify({expected,atInt32Max:a.total,afterInt32Max:b.total,atMaxMatches:a.total===expected,afterMaxMatches:b.total===expected}));
