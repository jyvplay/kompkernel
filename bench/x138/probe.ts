import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {synapheTrial} from '../../src/lib/omega/synaphe';
import {steliUndo} from '../../src/lib/omega/steli';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';
for(const l of fs.readFileSync('bench/x137/receipts/frontier.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(l);
 if(!['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n'].some(p=>a.message.startsWith(p+'§'))){console.log(JSON.stringify({path:a.path,unsupported:true}));continue;}
 for(const overlap of [false,true]){const start=performance.now(),c=synapheTrial(a.message,'o200k_base',overlap),ms=performance.now()-start;if(!c){console.log(JSON.stringify({path:a.path,overlap,eligible:false,ms}));continue;}
 assert.equal(c.tokens,encode(c.message).length);
 const sourceExact=Buffer.from(steliUndo(c.target)).equals(fs.readFileSync(a.path));
 console.log(JSON.stringify({path:a.path,A:a.tokens,B:c.tokens,delta:c.tokens-a.tokens,ms,sourceExact,...c}));}
}
