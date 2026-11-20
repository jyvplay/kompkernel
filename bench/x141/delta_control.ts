/** Existing positional integer differences, separate from the new dictionary views. */
import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {diaphoraSubstitute,diaphoraExpand,DIAPHORA_CONTRACT} from '../../src/lib/omega/diaphora';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
for(const a of fs.readFileSync('bench/x140/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l))){
 const text=fs.readFileSync(a.path,'utf8'),t=performance.now(),r=diaphoraSubstitute(text);
 assert.equal(diaphoraExpand(r.out),text);
 const message=r.n?DIAPHORA_CONTRACT+' Print only the reconstructed text.\n'+r.out:text;
 console.log(JSON.stringify({path:a.path,A:a.tokens,B:encode(message).length,sites:r.n,ms:performance.now()-t,sourceExact:true,nativeVerified:false,scope:'standalone existing delta transform; not full-parent composition'}));
}
