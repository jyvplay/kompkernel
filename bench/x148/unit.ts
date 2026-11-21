import fs from 'node:fs';import assert from 'node:assert/strict';import {epityposPlan,epityposRestore,epityposKey} from '../../src/lib/omega/epitypos';import {epityposRead} from '../../src/lib/omega/epitypos-frontier';
let checks=0,accepted=0;const eq=(a:unknown,b:unknown)=>{assert.deepEqual(a,b);checks++};
// Exhaust each printable ASCII byte in both styles, plus varied context/collisions.
for(let c=32;c<127;c++)for(const style of ['b','u'])for(const pre of ['','**literal** ','__literal__ ','** __ ^^ ~~ ','λ\n']){
 const ch=String.fromCharCode(c),s=pre+Array(4).fill((style==='b'?ch:'_')+'\b'+ch).join('')+'\n';const p=epityposPlan(s);if(p){eq(epityposRestore(p.folded,p.index),s);eq(epityposRead(p.contract+p.folded),s);eq(Buffer.from(p.contract+p.folded).toString(),p.contract+p.folded);accepted++}
}
for(const s of ['plain','x\by','a\b','\bA','A\bA\bA','A\bA\ud800',('A\bA').repeat(14000)])eq(epityposPlan(s),null);
for(const f of ['**unclosed','****','__x\ny__','**'+ 'a'.repeat(14000)+'**','**__nested__**']){assert.throws(()=>epityposRestore(f));checks++}
// Repair-targeted collision: real Perl __WARN__ literal is retained, not parsed as style.
for(const pre of ['__WARN__ ','**literal** ']){const s=pre+'N\bNA\bAM\bME\bE';const p=epityposPlan(s)!;assert.ok(p);checks++;eq(epityposRestore(p.folded,p.index),s);eq(epityposRead(p.contract+p.folded),s)}
for(const index of [-1,3,1.5]){assert.throws(()=>epityposKey(index));checks++}
const canonical=fs.readFileSync('bench/x109/lanes29.txt','utf8').trim().split('\n').map(path=>({path,eligible:!!epityposPlan(fs.readFileSync(path,'utf8'))}));
for(const path of ['overstrike-man.txt','text-man-full.txt','usage-man-full.txt']){const s=fs.readFileSync('bench/x148/heldout/'+path,'utf8'),p=epityposPlan(s)!;assert.ok(p);checks++;eq(epityposRestore(p.folded,p.index),s)}
fs.writeFileSync('bench/x148/receipts/unit.json',JSON.stringify({checks,accepted,canonical},null,2));console.log({checks,accepted});
