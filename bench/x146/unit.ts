import * as fs from 'node:fs';import assert from 'node:assert/strict';import {ekdysisPlans,ekdysisUndo,ekdysisKey,ekdysisDecode,ekdysisEncode} from '../../src/lib/omega/ekdysis';import {encode} from 'gpt-tokenizer/encoding/o200k_base';
let checks=0;const rows:any[]=[];
function round(source:string){for(const p of ekdysisPlans(source)){assert.equal(ekdysisUndo(p.folded,p.depth,p.whole),source);assert.equal(ekdysisDecode(p.message),source);assert.equal(encode(p.message).length,p.tokens);assert.equal(Buffer.from(p.message).toString(),p.message);rows.push({source,...p});checks+=4;}}
const samples=['a\n"b"\\c\tend','🧬 café\r\nA\0B\b\f','\u2028\u2029','⟦a⟧','/ & < >','\\u003c','\\ud800','JSON.stringify(text)'];
for(const sample of samples){let s=sample.repeat(20);for(let depth=1;depth<=4;depth++){s=JSON.stringify(s);round('{"message":'+s+'}\r\n');}}
// Seeded diagnostic enumeration, not a real-world corpus or native evaluator.
let seed=146;const alphabet=['a','"','\\','\n','\r','\t','é','🧬','\0','\b','\f'];
for(let i=0;i<1000;i++){let v='';for(let j=0;j<80;j++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;v+=alphabet[seed%alphabet.length];}round(JSON.stringify(v));}
for(const bad of ['⟦x','x⟧','⟦x⟦y⟧','⟦x⟧⟧','x'.repeat(100001),'\ud800']){assert.throws(()=>ekdysisUndo(bad,1));checks++;}
for(const depth of [0,5,1.5,NaN,Infinity]){assert.throws(()=>ekdysisUndo('⟦x⟧',depth));checks++;}
for(const source of ['"\\u0061"','"\\/"','"\\ud800"','"\\u00E9"','⟦plain⟧']){assert.equal(ekdysisPlans(source).length,0);checks++;}
assert.throws(()=>ekdysisEncode(ekdysisKey(1)+'literal'));checks++;
const t=performance.now();assert.equal(ekdysisPlans('"'+'\\"'.repeat(49000)).length,0);const unterminatedMs=performance.now()-t;checks++;
// Pure value equality is not byte fidelity: modal normalization shortcut fails.
assert.equal(JSON.parse('"\\u0061"'),JSON.parse('"a"'));assert.notEqual('"\\u0061"','"a"');checks+=2;
fs.writeFileSync('bench/x146/receipts/unit-wires.jsonl',rows.map(x=>JSON.stringify(x)).join('\n')+'\n');console.log(JSON.stringify({checks,accepted:rows.length,unterminatedMs,native:'NOT_RUN'}));
