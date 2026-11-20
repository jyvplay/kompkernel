import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {MNEMA_KEY,mnemaDecode,mnemaUndo,mnemaPlan,mnemaEncode} from '../../src/lib/omega/mnema';
let checks=0;const eq=(a:unknown,b:unknown)=>{assert.deepEqual(a,b);checks++;};const bad=(f:()=>unknown)=>{assert.throws(f);checks++;};
const mechanics=[
 ['authentication ^auth','authentication authentication'],
 ['apple apricot ^ap','apple apricot apricot'],
 ['apple apricot ^app ^a','apple apricot apple apple'],
 ['Alpha alpha ^A ^a','Alpha alpha Alpha alpha'],
 ['alpha\r\n\t^a!','alpha\r\n\talpha!'],
 ['🙂authentication_é^auth2','🙂authentication_éauthentication2'],
 ['one two one ^t ^o','one two one two one'],
 ['alpha ^alpha','alpha alpha'],
];
for(const [wire,want]of mechanics){eq(mnemaDecode(MNEMA_KEY+wire),want);}
for(const wire of ['^alpha','alpha ^A','alpha ^','alpha ^^a','alpha^a','alpha ^a^a','abcdefghijklmnop ^abcdefghijklm'])bad(()=>mnemaUndo(wire));
bad(()=>mnemaUndo('a '.repeat(10001)));
bad(()=>mnemaUndo('a'.repeat(50001)));
bad(()=>mnemaUndo('a'.repeat(30000)+' ^a'));
eq(mnemaPlan('original ^caret'),null);
eq(mnemaPlan('x '.repeat(10001)),null);
eq(mnemaPlan('hello',-1),null);
eq(mnemaEncode('short'),null);
// New strongest state attack: a copied word, not merely a literal, MUST move
// to the most recent position. Another call must never inherit that history.
eq(mnemaUndo('authority authentication ^author ^a'),'authority authentication authority authority');
bad(()=>mnemaUndo('^author'));
// Exhaustive small lexical sequences with separators and prefix collisions.
const words=['alpha','alpine','Alphabet','beta'];let seqs=[''];
for(let len=1;len<=5;len++){
 seqs=seqs.flatMap(s=>words.map(w=>s?s+' '+w:w));
 for(const s of seqs)for(const sep of [' ','\r\n','_','🙂'])for(const threshold of [0,1,2]){
  const text=s.replace(/ /g,sep),p=mnemaPlan(text,threshold);if(p)eq(mnemaDecode(p.message),text);else{eq(mnemaUndo(text),text);}
 }
}
fs.writeFileSync('bench/x141/receipts/mechanics.json',JSON.stringify(mechanics.map(([body,expected])=>({message:MNEMA_KEY+body,expected})),null,2));
console.log(JSON.stringify({checks,nativeVerified:false,generatedInputs:'adversarial code tests only, not evidence of workload gains'}));
