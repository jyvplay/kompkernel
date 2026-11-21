import {prepareRuns,prepareRunCostState,scoreRunCostDeltaSlots,runCostPrepared} from '../../src/lib/omega/ariadne';
const n=65537,runs=Array.from({length:n},(_,i)=>[0,i+1]),p=prepareRuns(runs),refs=Array.from({length:n+1},(_,i)=>i),before=refs.map((_,i)=>i?'b':'a'),after=before.slice();after[0]='🚀';const enc='o200k_base' as const,cache=new Map<string,number>();
const state=prepareRunCostState(p,refs,before,enc,cache),expected=runCostPrepared(p,new Map(refs.map(i=>[i,after[i]!])),enc,cache);
let result:number|null=null,error:string|null=null;try{result=scoreRunCostDeltaSlots(p,state,after,[0],enc,cache).total}catch(e){error=String(e)}
console.log(JSON.stringify({patterns:p.pats.length,expected,result,error,matches:result===expected}));
