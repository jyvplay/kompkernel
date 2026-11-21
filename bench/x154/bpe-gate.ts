import fs from 'node:fs';import assert from 'node:assert/strict';import {countTokens,pretokSource} from '../../src/lib/omega/bpe';import {encode} from 'gpt-tokenizer/encoding/o200k_base';
const strings=new Set<string>();const rows=fs.readFileSync('bench/x152/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
for(const r of rows)for(const s of [r.text,r.message]){strings.add(s);for(const c of s.match(new RegExp(pretokSource('o200k_base'),'gu'))??[])strings.add(c);}
for(const c of ['a','é','а','\u0800','\ud800','\udfff','🚀','\ufeff','\0','ᄀ','𐐀'])for(const n of [1,2,3,10,340,341,342,511,512,1023,1024,1025]){strings.add(c.repeat(n));strings.add('x'+c.repeat(n)+'é');}
for(let c=0;c<65536;c+=7)strings.add('a'+String.fromCharCode(c)+'Ж!');let checks=0;
for(const s of strings){assert.equal(countTokens(s,'o200k_base'),encode(s).length);checks++;}
console.log(JSON.stringify({checks,passed:true,scope:'reference tokenizer on all canonical source/wire chunks and deterministic Unicode/scratch-boundary attacks'}));
// Patch-specific attacks: force rank lookup around every 3..8-byte string-vocab
// entry instead of letting the whole-chunk vocabulary shortcut hide the table.
const O:any=await import('gpt-tokenizer/encoding/o200k_base');const core=O.default?.bytePairEncodingCoreProcessor??O.bytePairEncodingCoreProcessor;let hashChecks=0;
for(const [s] of core.bytePairStringRankEncoder){const bytes=Buffer.byteLength(s);if(bytes<3||bytes>8)continue;for(const x of ['Ж'+s+'z','x'+s+'\u0080']){assert.equal(countTokens(x,'o200k_base'),encode(x).length);hashChecks++;}}
console.log(JSON.stringify({hashChecks,passed:true,scope:'all 3..8-byte string vocabulary entries with forced surrounding material; invalid UTF8 and scalar boundaries covered in primary gate'}));
