import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {kremaFast} from '../../src/lib/omega/krema';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
for(const path of ['bench/holdout-x41/node-help.txt','bench/x137/heldout/node-help.txt']){
 const text=fs.readFileSync(path,'utf8'),t=performance.now(),c=kremaFast(text),ms=performance.now()-t;
 assert.ok(c);assert.equal(c.tokens,encode(c.message).length);
 console.log(JSON.stringify({path,ms,B:c.tokens,...c}));
}
