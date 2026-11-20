import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {tagstackEncode} from '../../src/lib/omega/tagstack';
import {eikonTrial,eikonDecode} from '../../src/lib/omega/eikon';
import {steliUndo} from '../../src/lib/omega/steli';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
for(const {path} of JSON.parse(fs.readFileSync('bench/x140/receipts/heldout-policy.json','utf8'))){
 const text=fs.readFileSync(path,'utf8'),t=performance.now(),r=tagstackEncode(text),ms=performance.now()-t;
 assert.equal(r.decoded,text);assert.equal(encode(r.message).length,r.messageTokens);
 fs.appendFileSync('bench/x140/receipts/heldout-baseline.jsonl',JSON.stringify({path,text,message:r.message,tokens:r.messageTokens,ms})+'\n');
 const start=performance.now(),x=eikonTrial(r.message);if(x)assert.equal(steliUndo(eikonDecode(x.message)),text);
 console.log(JSON.stringify({path,A:r.messageTokens,B:x?.tokens,ms:performance.now()-start,sourceExact:!!x,...x}));
}
