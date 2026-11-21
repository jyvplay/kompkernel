import fs from 'node:fs';import assert from 'node:assert/strict';import {stoibasFromFrontier} from '../../src/lib/omega/stoibas-frontier';let checks=0;
const source='{\n  "x": 1\n}\n',forbidden=()=>{throw Error('unexpected parent call');};
let r=stoibasFromFrontier('ordinary prose\n','ordinary prose\n',forbidden);assert.equal(r.applied,false);assert.equal(r.parentCalls,0);checks+=2;
r=stoibasFromFrontier(source,'different source',forbidden);assert.equal(r.message,'different source');assert.equal(r.parentCalls,0);checks+=2;
r=stoibasFromFrontier(source,source,()=>'{ x\n2');assert.equal(r.message,source);assert.equal(r.parentCalls,1);checks+=2;
r=stoibasFromFrontier(source,source,()=>'{ x\n1');assert.equal(r.applied,false);assert.equal(r.message,source);checks+=2;
let calls=0;r=stoibasFromFrontier('{}\n','{}\n',()=>{calls++;return '{';});assert.equal(calls,1);assert.equal(r.applied,false);checks+=2;
assert.throws(()=>stoibasFromFrontier('\ud800','x',forbidden));checks++;
fs.writeFileSync('bench/x155/receipts/wrapper-attacks.json',JSON.stringify({checks,passed:true})+'\n');console.log({checks});
