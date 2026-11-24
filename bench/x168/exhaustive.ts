import fs from 'node:fs';import assert from 'node:assert/strict';import {diadochiUndo} from '../../src/lib/omega/diadochi';
// Exhaust all 1..7-field sequences and all eight context subsets over this
// three-field alphabet, including the empty field. This is finite verification.
const alphabet=['','a','b'];let checks=0,sourceCount=0;const pack=(a:string[])=>a.length?a.join(' '):null;
for(let n=1;n<=7;n++)for(let value=0;value<3**n;value++){let x=value;const fields=[];for(let j=0;j<n;j++){fields.push(alphabet[x%3]);x=Math.floor(x/3);}sourceCount++;
 for(let mask=0;mask<8;mask++){const rows=new Map(alphabet.filter((_,i)=>mask&(1<<i)).map(k=>[k,[] as string[]])),fallback:string[]=[];
  for(let j=1;j<n;j++)(rows.get(fields[j-1])??fallback).push(fields[j]);const wire=JSON.stringify([fields[0],pack(fallback),[...rows].map(([k,a])=>[k,pack(a)])]);assert.equal(diadochiUndo(wire),fields.join(' '));checks++;
 }
}
fs.writeFileSync('bench/x168/receipts/exhaustive.json',JSON.stringify({checks,sourceCount,alphabet,maxFields:7,contextSubsets:8,scope:'finite exhaustive inverse of actual TypeScript decoder, not universal proof or native decoding'},null,2));console.log({checks,sourceCount});
