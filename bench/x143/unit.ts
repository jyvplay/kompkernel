import * as fs from 'node:fs';import assert from 'node:assert/strict';import {protasisPlans,protasisUndo,protasisEncode,protasisDecode,protasisKey} from '../../src/lib/omega/protasis';
let checks=0;const fixtures=[];
for(const text of ['A. Boy! Cat? Dog.','a. boy! Cat? dog.',' A.\r\n\tB. c.','A.\u00a0b. C','A.B. C','A!?! B','A. "Boy". Cat','A.\n\n B','A\nB\nC\n','🙂. A\ud800. B','\ufeffA. B']){
 for(const p of protasisPlans(text)){assert.equal(protasisUndo(p.folded,p.mode),text);assert.equal(protasisDecode(p.message),text);checks+=2;fixtures.push({message:p.message,mode:p.mode,expected:text});}
}
const alphabet=['A','a','Z','z','.','!','?',' ','\t','\r','\n','"','😀','\ud800'];let seed=143;
for(let i=0;i<5000;i++){let text='A';for(let j=0;j<i%100;j++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;text+=alphabet[seed%alphabet.length];}
 for(const p of protasisPlans(text)){assert.equal(protasisUndo(p.folded,p.mode),text);checks++;}
 const e=protasisEncode(text);assert.equal(e.decoded,text);assert.equal(protasisDecode(e.message),text);checks+=2;
}
for(const mode of ['sentence','line']as const)for(const s of ['~','~A','~1','x~a']){assert.throws(()=>protasisUndo(s,mode));checks++;}
assert.deepEqual(protasisPlans('A~b'),[]);checks++;
assert.deepEqual(protasisPlans('A'.repeat(50001)),[]);checks++;
for(const mode of ['sentence','line']as const){assert.throws(()=>protasisEncode(protasisKey(mode)+'a'));checks++;}
assert.equal(protasisDecode(protasisEncode('literal ~a').message),'literal ~a');checks++;
// Patch attack: exception insertion must not exceed the decoder's input cap.
assert.deepEqual(protasisPlans('a\n'.repeat(24999)+'A\n'),[]);checks++;
assert.equal(protasisUndo('a\rb\nc','line'),'A\rb\nC');checks++;
// Repaired whitespace-rule attack: NBSP is NOT one of four skipped characters.
assert.equal(protasisUndo('a.\u00a0b','sentence'),'A.\u00a0b');checks++;
fs.writeFileSync('bench/x143/receipts/mechanics.json',JSON.stringify(fixtures,null,2));
console.log(JSON.stringify({checks,fixtures:fixtures.length,nativeVerified:false}));
