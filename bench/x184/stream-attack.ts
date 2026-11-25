import assert from 'node:assert/strict';import {fastCount} from '../../src/lib/omega/bpe-fast';import {encode} from 'gpt-tokenizer/encoding/o200k_base';
const atoms=['','a','\n','\r',' ','  ','a\n','é','🙂','\ud800','\udc00','\u0000','\ufeff','<|endoftext|>','漢字','12','1234'];let checks=0;
for(const a of atoms)for(const b of atoms)for(const c of atoms){const s=a+b+c,expected=encode(s,{disallowedSpecial:new Set()}).length;assert.equal(fastCount(s),expected);assert.equal(encode(s,{disallowedSpecial:new Set()}).length,expected);assert.equal(fastCount(s),expected);checks+=3;}
console.log(JSON.stringify({checks,passed:true,scope:'stream boundaries, shared regex state, astral/lone surrogates, repeated warm calls'}));
