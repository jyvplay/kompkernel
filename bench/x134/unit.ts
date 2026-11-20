import assert from 'node:assert/strict';
import {allomorphFromFrontier} from '../../src/lib/omega/allomorph';
import {chironDecode} from '../../src/lib/omega/chiron';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
let cases=0,wins=0;
for(const [g,k] of [['ы','и'],['щ','о'],['ю','а'],['ф','т'],['я','с']]){
 const m='Before ¶ k=v; expand repeatedly; print only.\n§'+g+'alpha'+k+'beta¶'+(g+k+' ').repeat(24);
 const src=chironDecode(m.slice(m.indexOf('§')));
 const b=allomorphFromFrontier(m,src);cases++;
 if(b){wins++;assert.equal(chironDecode(b.message.slice(b.message.indexOf('§'))),src);assert.equal(encode(b.message).length,b.tokens);assert.ok(b.tokens<encode(m).length);}
}
// Refusal boundaries, not claimed corpus evidence.
for(const m of ['', 'hello', '§', '§аfoo', '§аfooбbar¶аб', '§afoobbar¶ab']){
 const b=allomorphFromFrontier(m,m);cases++;if(b)assert.ok(encode(b.message).length<encode(m).length);
}
// Attacks on the parser repair: declared Arabic, source characters overlapping
// names, Unicode payloads, cyclic wire, and size boundary. No source hint parses
// the dictionary; actual decoder equivalence must hold for every admitted edit.
for(const [g,k] of [['س','م'],['ы','и']])for(const value of ['emoji🙂', 'e\u0301', '\r\n\t', '§', '※']){
 const m='Before ¶ k=v; expand repeatedly; print only.\n§'+g+value+k+'tail¶'+(g+k+' ').repeat(12);
 const src=chironDecode(m.slice(m.indexOf('§')));
 for(const encoderSource of [src,src+g+k]){cases++;const b=allomorphFromFrontier(m,encoderSource);
  if(b){assert.equal(chironDecode(b.message.slice(b.message.indexOf('§'))),src);assert.equal(encode(b.message).length,b.tokens);assert.ok(b.tokens<encode(m).length);}
 }
}
for(const m of ['§аа¶а','§а×zа3¶а','§аfoo¶'+'а'.repeat(65536)]){cases++;assert.equal(allomorphFromFrontier(m,''),null);}
assert.ok(wins>0,'positive unit witness must exercise admission');
console.log(JSON.stringify({cases,positiveUnitWitnesses:wins,note:'constructed adversarial unit tests, NOT corpus gains'}));
