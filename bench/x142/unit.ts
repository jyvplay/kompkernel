import * as fs from 'node:fs';import assert from 'node:assert/strict';
import {eutaxiaEncode,eutaxiaPlans,eutaxiaUndo,eutaxiaKey,type EutaxiaSpec} from '../../src/lib/omega/eutaxia';
let checks=0;const fixtures:any[]=[];
for(const numeric of [false,true])for(const descending of [false,true])for(const finalLF of [false,true])for(let n=8;n<=64;n++){
 const lines=Array.from({length:n},(_,i)=>`${String(i+1).padStart(3,'0')} ${['zebra','apple','pear'][i%3]}  value ${n-i}`);if(descending)lines.reverse();
 const text='header\n'+lines.join('\n')+(finalLF?'\n':'');
 const spec:EutaxiaSpec={start:1,count:n,field:1,numeric,descending};const scrambled='header\n'+lines.slice().reverse().join('\n')+(finalLF?'\n':'');
 assert.equal(eutaxiaUndo(scrambled,spec),text);checks++;
 for(const p of eutaxiaPlans(text)){assert.equal(eutaxiaUndo(p.folded,p.spec),text);checks++;}
 if(n===8)fixtures.push({message:eutaxiaKey(spec)+scrambled,expected:text});
}
for(const [text,spec]of [
 ['01 a\n1 b',{start:0,count:2,field:1,numeric:true,descending:false}],
 ['1 a\n1 b',{start:0,count:2,field:1,numeric:false,descending:false}],
 ['a\nb',{start:0,count:2,field:2,numeric:false,descending:false}],
 ['1 a\n2 b',{start:-1,count:2,field:1,numeric:true,descending:false}],
 ['1 a\n2 b',{start:0,count:3,field:1,numeric:true,descending:false}],
 ['1 a\n2 b\r',{start:0,count:2,field:1,numeric:true,descending:false}],
 ['1 a\n2 😀',{start:0,count:2,field:1,numeric:true,descending:false}],
 ]as [string,EutaxiaSpec][]){assert.throws(()=>eutaxiaUndo(text,spec));checks++;}
// Patch attack: integer keys beyond Number precision must not collapse.
const spec:EutaxiaSpec={start:0,count:2,field:1,numeric:true,descending:false};
assert.equal(eutaxiaUndo('9007199254740993 b\n9007199254740992 a',spec),'9007199254740992 a\n9007199254740993 b');checks++;
for(const x of ['', 'x\r\ny', 'é', 'x'.repeat(50001),'x\n'.repeat(1001)]){assert.deepEqual(eutaxiaPlans(x),[]);checks++;}
for(const parent of [{decoded:'other',exact:true,frontierComplete:true},{decoded:'x',exact:false,frontierComplete:true},{decoded:'x',exact:true,frontierComplete:false}]){assert.throws(()=>eutaxiaEncode('x','o200k_base',parent as any));checks++;}
fs.writeFileSync('bench/x142/receipts/mechanics.json',JSON.stringify(fixtures,null,2));
console.log(JSON.stringify({checks,mechanics:fixtures.length,nativeVerified:false}));
