import * as fs from 'node:fs';import assert from 'node:assert/strict';import * as bpe from '../../src/lib/omega/bpe';
const toggle=(bpe as unknown as {setTailFold:(v:boolean)=>void}).setTailFold;
const samples=new Set<string>(['',' ','\r\n','a\n \t','\uFEFF','\ud800','x\udc00','é\u0301\n','🙂\t','a\u2028','a\u00a0']);
for(const line of fs.readFileSync('bench/x142/receipts/frontier.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(line);for(const text of [a.text,a.message]){samples.add(text);for(let i=0;i<text.length;i+=7)samples.add(text.slice(i,i+1+i%80));}
}
let seed=143;const alphabet='aA0 .!?\t\r\n_~';for(let i=0;i<3000;i++){let s='';for(let j=0;j<i%80;j++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;s+=alphabet[seed%alphabet.length];}samples.add(s);}
let checks=0;
for(const enc of ['o200k_base','cl100k_base']as const){
 toggle(false);const old=[...samples].map(s=>bpe.tokenTail(s,enc));
 toggle(true);let i=0;for(const s of samples){const a=bpe.tokenTail(s,enc);assert.deepEqual(a,old[i++]);checks++;
 if(a){assert.equal(a.tot,bpe.countTokensExact(s,enc));assert.equal(a.tailTok,bpe.countTokensExact(a.tail,enc));checks+=2;}}
}
toggle(false);console.log(JSON.stringify({distinctStrings:samples.size,checks,encodings:2,modeTransitionTested:true}));
