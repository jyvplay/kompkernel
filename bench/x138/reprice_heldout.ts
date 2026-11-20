import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {synapheTrial} from '../../src/lib/omega/synaphe';
import {steliUndo} from '../../src/lib/omega/steli';
import {kremaFast} from '../../src/lib/omega/krema';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
for(const l of fs.readFileSync('bench/x138/receipts/heldout-baseline.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(l),text=fs.readFileSync(a.path,'utf8');
 for(const overlap of [false,true]){const t=performance.now(),c=synapheTrial(a.message,'o200k_base',overlap);if(!c)continue;assert.equal(steliUndo(c.target),text);assert.equal(c.tokens,encode(c.message).length);console.log(JSON.stringify({path:a.path,kind:overlap?'SYNAPHE':'concat',A:a.tokens,B:c.tokens,ms:performance.now()-t,sourceExact:true,message:c.message}));}
 const t=performance.now(),c=kremaFast(text);console.log(JSON.stringify({path:a.path,kind:'KREMA-fast-existing',A:a.tokens,B:c?.tokens??a.tokens,eligible:!!c,ms:performance.now()-t,...(c?{message:c.message}:{})}));
}
