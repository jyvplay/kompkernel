import assert from 'node:assert/strict';import fs from 'node:fs';
import {HOMOSEMA_MODES,homosemaPlans,homosemaUndo,homosemaRead,homosemaCandidate,homosemaKey,homosemaSelect} from '../../src/lib/omega/homosema';
let checks=0;const eq=(a:unknown,b:unknown)=>{assert.deepEqual(a,b);checks++};
const sources=['{"a":1,"a":2,"s":"[,]};:\\\"","n":1e+300}', '{\r\n\t"a" : [true, false,null, -0, 123456789012345678901234567890], "u":"\\ud800"\r\n}\n','[{},[],{"nested":[{"x":"日本語"}]}]','"scalar"','-0','true','null'];
for(let n=0;n<30;n++)sources.push(JSON.stringify({n,a:Array.from({length:n},(_,i)=>({x:i,y:[null,i%2===0,'a\\"[,]'],z:'é🚀'}))}));
for(const s of sources){for(const p of homosemaPlans(s)){eq(homosemaUndo(p.folded,p.mode),s);eq(homosemaRead(p.message),s);eq(homosemaCandidate(s,p.mode,p.folded,x=>x)?.message,p.message);eq(homosemaCandidate(s+' ',p.mode,p.folded,x=>x),null);eq(homosemaSelect(s,p.mode,p.folded,p.message,x=>x),null);eq(homosemaSelect(s,p.mode,p.folded,'x',x=>x),null);}}
for(const bad of ['{"a":1,}','[1,]','[01]','{"a" 1}','{"a":NaN}','[1 2]','["\u0000"]','["\\x00"]','{}{}','[}', '["unterminated]','[1e]','[+1]','[.1]', '{"a":1}\ud800','['.repeat(130)+'0'+']'.repeat(130),' '.repeat(50001)+'{}'])eq(homosemaPlans(bad),[]);
for(const mode of HOMOSEMA_MODES){let threw=false;try{homosemaRead(homosemaKey(mode)+'[1'+(mode.separator??',')+']')}catch{threw=true}eq(threw,true);}
// Boundary/patch-targeted attacks: depth cap is inclusive; lexical numbers never round.
const bounded='['.repeat(128)+'1e309'+']'.repeat(128);eq(homosemaPlans(bounded).length>0,true);
eq(homosemaPlans('['.repeat(129)+'0'+']'.repeat(129)),[]);
for(const m of HOMOSEMA_MODES){eq(homosemaUndo('"'+'x'.repeat(49998)+'"',m),'"'+'x'.repeat(49998)+'"');let threw=false;try{homosemaUndo('"'+'x'.repeat(49999)+'"',m)}catch{threw=true}eq(threw,true);}
// Lexical fidelity counterexample to a data-model-only roundtrip.
const lexical='{"a":1,"a":2,"n":-0,"e":1e+02,"s":"\\u0061"}';eq(JSON.stringify(JSON.parse(lexical))===lexical,false);
fs.writeFileSync('bench/x152/receipts/unit.json',JSON.stringify({checks,passed:true,scope:'deterministic constructed unit fixtures, not natural heldout evidence'},null,2));console.log({checks});
const p=homosemaPlans(sources[0]!)[0]!;fs.writeFileSync('bench/x152/receipts/unit-source.txt',sources[0]!);fs.writeFileSync('bench/x152/receipts/unit-wire.txt',p.message);fs.writeFileSync('bench/x152/receipts/unit-mode.json',JSON.stringify(p.mode));
