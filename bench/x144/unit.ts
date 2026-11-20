import assert from 'node:assert/strict';
import {psifidaPlans,psifidaUndo,psifidaEncode,psifidaDecode,PSIFIDA_KEY} from '../../src/lib/omega/psifida';
let checks=0,plans=0;
function test(s:string){for(const p of psifidaPlans(s)){assert.equal(psifidaUndo(p.folded),s);assert.ok(Buffer.from(psifidaUndo(p.folded)).equals(Buffer.from(s)));checks+=2;plans++;}const e=psifidaEncode(s);assert.equal(psifidaDecode(e.message),s);checks++;}
for(const s of ['', '00 01 09\r\n00','id001 id012 id999','🙂22\u000000 99', '~11', '١٢ １２ 12 13 14', '\ud80012\udc0013\ud80014', '12.13.14', '99-00-01\n', '12 123 1234 12 123 1234 12 123 1234'])test(s);
let state=144;const rnd=()=>state=(Math.imul(state,1664525)+1013904223)>>>0;
for(let t=0;t<1000;t++){let s='';for(let i=0;i<10;i++)s+=[' x','\n','\r\n','\t','🙂','\0'][rnd()%6]+String(rnd()%100000).padStart(5,'0');test(s);}
for(const s of ['','123\nx','12 3\n~~','ab cd\n~~','12 34\n~','12 34\n~~~','1 2\n~~']){assert.throws(()=>psifidaUndo(s));checks++;}
assert.throws(()=>psifidaEncode(PSIFIDA_KEY));checks++;
assert.equal(psifidaPlans('1'.repeat(50001)).length,0);checks++;
// The first line is metadata, not a source line; final LF and zero prefixes survive.
assert.equal(psifidaUndo('001 127\n~\r\n~\0~\n'),'01\r\n02\u000017\n');checks++;
assert.throws(()=>psifidaUndo('1'.repeat(10001)+' '+'2'.repeat(10001)+'\n'+'~'.repeat(10001)));checks++;
console.log(JSON.stringify({checks,plans,scope:'UTF-16 exact; byte assertions only claim valid UTF-8 fixtures, not lone-surrogate bytes'}));
