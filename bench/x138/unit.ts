import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {SYNAPHE_KEY,synapheDecode,synapheOverlap,synapheTrial,synapheFromFrontier} from '../../src/lib/omega/synaphe';
let checks=0;
for(const [l,r,k]of [['abc','bcd',2],['aaaa','aaa',3],['x','y',0],['','a',0],['abc','abc',3],['abcab','abcd',2]] as const){assert.equal(synapheOverlap(l,r),k);checks++;}
for(const [wire,out]of [['§аabcбbcd¶аб','abcd'],['§аabc¶аа','abc'],['§аabcбbcd¶а!б','abc!bcd'],['§аabcбbcd¶аб\n','abcd\n'],['§аabcбаd¶аб','abcd']] as const){assert.equal(synapheDecode(SYNAPHE_KEY+wire),out);checks++;}
// Distinguish new concatenation from ordinary recursive substitution.
assert.notEqual(synapheDecode(SYNAPHE_KEY+'§аabcбbcd¶аб'),'abcbcd');checks++;
for(const s of ['', '§аabc¶а',SYNAPHE_KEY+'§',SYNAPHE_KEY+'§а¶а']){assert.throws(()=>synapheDecode(s));checks++;}
// Patch-specific adversary: never strip an unknown composed parent's contract.
assert.equal(synapheTrial('Reverse the decoded text.\n§аabc¶а'),null);checks++;
const pre='¶ k=v. expand repeatedly; print only.\n';
assert.equal(synapheTrial(pre+'§а🙂¶а'),null);checks++;
assert.equal(synapheFromFrontier(pre+'§аabc¶а'),null);checks++;
assert.throws(()=>synapheDecode(SYNAPHE_KEY+'§аabc¶'+'x'.repeat(100001)));checks++;
for(const l of fs.readFileSync('bench/x138/receipts/probe.jsonl','utf8').trim().split('\n')){
 const r=JSON.parse(l);if(!r.overlap||!r.message)continue;
 assert.equal(synapheDecode(r.message),r.target);checks++;
}
// Exhaust all small binary pairs against a separate longest-prefix definition.
const words=[''];for(let n=1;n<=6;n++)for(let i=0;i<2**n;i++)words.push(i.toString(2).padStart(n,'0'));
for(const a of words)for(const b of words){const ks=Array.from({length:b.length+1},(_,i)=>i).filter(k=>a.endsWith(b.slice(0,k)));assert.equal(synapheOverlap(a,b),Math.max(...ks));checks++;}
console.log(JSON.stringify({checks,nativeVerified:false,scope:'mechanics plus patch-specific rejection; synthetic strings are attacks, not workload gains'}));
