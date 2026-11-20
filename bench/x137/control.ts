/** Existing WRAPCANON gets the same parent and a fused contract. */
import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {wrapEncode,wrapDecode} from '../../src/lib/omega/wrapcanon';
import {tagstackEncode} from '../../src/lib/omega/tagstack';
import {readParent} from '../x135/reader';
import {countTokens} from '../../src/lib/omega/bpe';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
for(const path of ['bench/holdout-x41/node-help.txt','bench/x137/heldout/node-help.txt']){
 const text=fs.readFileSync(path,'utf8'),folded=wrapEncode(text,69,'~')!;assert.equal(wrapDecode(folded,69,'~'),text);
 const t=performance.now(),parent=tagstackEncode(folded),ms=performance.now()-t;
 assert.equal(wrapDecode(readParent(parent.message),69,'~'),text);
 const pre='¶ k=v. expand repeatedly; print only.\n';assert.ok(parent.message.startsWith(pre));
 const key='¶ k=v; expand recursively. In single-line paragraphs, remove initial ~; otherwise greedy-wrap to 69 columns. Print only.\n';
 const message=key+parent.message.slice(pre.length);
 console.log(JSON.stringify({path,B:countTokens(message,'o200k_base'),ms,sourceExact:true,foldedChanged:folded!==text,message}));
}
