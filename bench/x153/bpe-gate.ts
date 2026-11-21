import fs from 'node:fs';import assert from 'node:assert/strict';import {countTokens,pretokSource} from '../../src/lib/omega/bpe';import {encode} from 'gpt-tokenizer/encoding/o200k_base';
const strings=new Set<string>();const rows=fs.readFileSync('bench/x152/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
for(const r of rows)for(const s of [r.text,r.message]){strings.add(s);for(const c of s.match(new RegExp(pretokSource('o200k_base'),'gu'))??[])strings.add(c);}
for(const c of ['a','é','а','\u0800','\ud800','\udfff','🚀','\ufeff','\0','ᄀ','𐐀'])for(const n of [1,2,3,10,340,341,342,511,512,1023,1024,1025]){strings.add(c.repeat(n));strings.add('x'+c.repeat(n)+'é');}
for(let c=0;c<65536;c+=7)strings.add('a'+String.fromCharCode(c)+'Ж!');let checks=0;
for(const s of strings){assert.equal(countTokens(s,'o200k_base'),encode(s).length);checks++;}
console.log(JSON.stringify({checks,passed:true,scope:'reference tokenizer on all canonical source/wire chunks and deterministic Unicode/scratch-boundary attacks'}));
