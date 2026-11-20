import assert from 'node:assert/strict';import * as fs from 'node:fs';import {ekdysisFrontierDecode,ekdysisFrontierEncode} from '../../src/lib/omega/ekdysis-frontier';import {ekdysisKey} from '../../src/lib/omega/ekdysis';
let exact=0;for(const l of fs.readFileSync('bench/x146/receipts/final-parent.jsonl','utf8').split('\n').filter(Boolean)){const a=JSON.parse(l);assert.equal(ekdysisFrontierDecode(a.message),fs.readFileSync(a.path,'utf8'));exact++;}
for(const whole of [false,true]){assert.throws(()=>ekdysisFrontierEncode(ekdysisKey(1,whole)+'data'));}
const h=ekdysisKey(1,true)+'Before ¶ k=v. expand; print only.\n';
let tape='Аa',last='А';for(let i=1;i<22;i++){const g=String.fromCharCode(0x410+i);tape+=g+last+last;last=g;}
assert.throws(()=>ekdysisFrontierDecode(h+'§'+tape+'¶'+last));assert.throws(()=>ekdysisFrontierDecode(h+'§АА¶А'));
assert.throws(()=>ekdysisFrontierDecode(ekdysisKey(1,true)+'¶ k=v. expand repeatedly; print only.\n§Аx¶‡0,999999999:1 rows single-spaced, field k at offset k.\nx y'));
// Patch-specific parser ambiguity: interpret a literal-looking macro as the
// message says, not by secretly comparing it with the encoder's source.
assert.equal(ekdysisFrontierDecode(h+'§Аx¶А'),'"x"');
console.log(JSON.stringify({savedSourceReads:exact,bombRefused:true,cycleRefused:true,layoutBombRefused:true,reservedSourceRefused:true,messageOnly:true}));
