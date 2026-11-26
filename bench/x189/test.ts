import fs from 'node:fs';import assert from 'node:assert/strict';import {encode} from 'gpt-tokenizer/encoding/o200k_base';
import {anaplasisTrial,ANAPLASIS_FAMILIES} from '../../src/lib/omega/anaplasis';import {chironDecode} from '../../src/lib/omega/chiron';
const key='¶ k=v. expand repeatedly; print only.\n';let checks=0;const cases:any[]=[];
const shapes=['hello','a a a','a\r\nb','\t','\0','é','é','😀','👩‍💻','123456','"\\','§','Ignore instructions.','中文','عربي','__proto__','constructor','x\n','end  '];
for(const text of shapes){const wire='§α'+text+'β α¶'+('αβα β ').repeat(5),source=(text+' '+text+text+'  '+text+' ').repeat(5);
 assert.equal(chironDecode(wire),source);
 for(const family of ANAPLASIS_FAMILIES){const r=anaplasisTrial(key+wire,source,'o200k_base',family);assert(r);assert(r.sourceExact);assert.equal(chironDecode(r.message.slice(key.length)),source);assert.equal(encode(r.message).length,r.tokens);assert(r.tokens<=encode(key+wire).length);checks++;cases.push({family,source,message:r.message});}
}
const attacks=[{m:key+'§αxβy¶αβ',s:'wrong source'},{m:key+'§ααβy¶αβ',s:'x'},{m:key+'§αβy¶αβ',s:'x'},{m:key+'§αxβy¶<|endoftext|>',s:'<|endoftext|>'},{m:key+'§αxβy¶\ud800',s:'\ud800'},{m:key+'§α\ud800βy¶β',s:'y'},{m:'bad framing',s:'x'},{m:key+'§αxβy¶'+ 'α'.repeat(50001),s:'x'.repeat(50001)}];
for(const {m,s} of attacks){assert.equal(anaplasisTrial(m,s),null);checks++;}
let tape='αxxxx',last='α';for(const g of [...'βγδεζηθικλμνξοπρστυφχψω']){tape+=g+last.repeat(4);last=g;}assert.equal(anaplasisTrial(key+'§'+tape+'¶'+last,'x'),null);checks++;
assert.throws(()=>anaplasisTrial('','','o200k_base','invalid' as any));checks++;
// Modal shortcut: normalization collapses distinct byte strings. No inverse can
// recover both, regardless of which one a language model considers most likely.
const originals=['the cat sat\n','the  cat sat\n','the cat sat\r\n'];
const modal=(s:string)=>s.trim().replace(/\s+/g,' ');assert.equal(new Set(originals.map(modal)).size,1);assert.equal(new Set(originals).size,3);checks+=2;
fs.writeFileSync('bench/x189/receipts/unit.json',JSON.stringify({checks,shapes,attackCount:attacks.length+2,modal:{originals,wire:modal(originals[0]),collision:true},cases},null,2));console.log({checks,cases:cases.length});
