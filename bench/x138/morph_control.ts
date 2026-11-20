import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {morphEncode,morphDecode,morphDecoderPrompt} from '../../src/lib/omega/morph';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
for(const a of fs.readFileSync('bench/x137/receipts/frontier.jsonl','utf8').trim().split('\n').map(JSON.parse)){
 const text=fs.readFileSync(a.path,'utf8'),t=performance.now(),r=morphEncode(text),ms=performance.now()-t;
 assert.equal(morphDecode(r.wire),text);
 const message=r.applied?morphDecoderPrompt(r)+'\n'+r.wire:text;
 console.log(JSON.stringify({path:a.path,A:a.tokens,B:encode(message).length,applied:r.applied,ms,sourceExact:true,nativeVerified:false,contractEligible:!r.applied,contractWarning:r.applied?'Existing MORPH prompt asks reasoning in shorthand, not exact reconstruction; not an admissible native-output competitor.':null}));
}
