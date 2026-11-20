import * as fs from 'node:fs';import assert from 'node:assert/strict';import {tagstackEncode,tagstackFrontier,tagstackEncodeUncached,tagstackX74Chain,tagstackMemoClear} from '../../src/lib/omega/tagstack';import {isUtf8TransportStable} from '../../src/lib/omega/utf8-wire';import {chironDecode} from '../../src/lib/omega/chiron';import {encode} from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
for(const l of fs.readFileSync('bench/x144/receipts/heldout-baseline.jsonl','utf8').trim().split('\n')){
 const old=JSON.parse(l),source=fs.readFileSync(old.path,'utf8'),t=performance.now(),a=tagstackEncode(source);assert.equal(a.decoded,source);assert.equal(Buffer.from(a.message).toString('utf8'),a.message);assert.equal(encode(a.message).length,a.messageTokens);
 let wireRead=false;const start=a.message.indexOf('§');if(start>=0&&a.message.startsWith('Before ¶ k=v. expand; print only.\n')){assert.equal(chironDecode(Buffer.from(a.message.slice(start)).toString('utf8')),source);wireRead=true;}
 if(a.message===source)wireRead=true;
 console.log(JSON.stringify({path:old.path,A:old.tokens,B:a.messageTokens,message:a.message,source,ms:performance.now()-t,transportStable:true,wireRead,parent:a.parentCodec}));
 if(old.path.endsWith('vite.md')){
  delete process.env.OMEGA_NO_MEMO;tagstackMemoClear();const b=tagstackEncode(source),c=tagstackEncode(source);assert.equal(b.message,a.message);assert.equal(c.message,a.message);assert.ok(isUtf8TransportStable(c.message));process.env.OMEGA_NO_MEMO='1';
 }
}
// Patch-directed invalid-source attacks, including all exported routes and memo mode.
for(const fn of [tagstackEncode,tagstackFrontier,tagstackEncodeUncached,tagstackX74Chain])for(const text of ['x\ud800','\udc00x'])assert.throws(()=>fn(text));
