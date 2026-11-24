import assert from 'node:assert/strict';import fs from 'node:fs';import {metridaUndo} from './weighted-metrida';let checks=0;const collisions=[];
for(let a=1;a<=4;a++)for(let b=1;b<=4;b++)if(a!==b)for(let sites=1;sites<=8;sites++){
 const rules=[['Q','a'.repeat(a),'b'.repeat(b)]],possible=new Map<number,string[]>();
 function walk(words:string[]){if(words.length===sites){const sum=words.reduce((s,w,i)=>s+(i+1)*w.length,0);possible.set(sum,[...(possible.get(sum)??[]),words.join(' ')]);return;}for(const w of rules[0].slice(1))walk([...words,w]);}walk([]);
 for(let sum=0;sum<=4*sites*(sites+1)/2;sum++){const folded=JSON.stringify(rules)+'\n~'+sum+':'+Array(sites).fill('Q').join(' '),solutions=possible.get(sum)??[];if(solutions.length===1)assert.equal(metridaUndo(folded),solutions[0]);else assert.throws(()=>metridaUndo(folded));checks++;if(solutions.length>1&&a===1&&b===2&&sites===4)collisions.push({sum,solutions});}
}
assert.equal(metridaUndo('[["Q","a","bb"]]\n~5:Q Q'),'a bb');assert.equal(metridaUndo('[["Q","a","bb"]]\n~4:Q Q'),'bb a');checks+=2;
fs.writeFileSync('bench/x172/receipts/weighted.json',JSON.stringify({checks,collisions,conclusion:'Weights distinguish two swapped sites but not all longer ordered assignments; reject nonunique, never infer native success.'},null,2));console.log({checks,collisions:collisions.length});
