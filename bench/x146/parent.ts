import * as fs from 'node:fs';import assert from 'node:assert/strict';import {tagstackEncode} from '../../src/lib/omega/tagstack';import {ekdysisPlans,ekdysisUndo} from '../../src/lib/omega/ekdysis';import {countTokens} from '../../src/lib/omega/bpe';import {readParent} from '../x135/reader';import {chironDecode} from '../../src/lib/omega/chiron';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';process.env.OMEGA_SCALAR='0';
for(const path of process.argv.slice(2)){const source=fs.readFileSync(path,'utf8'),t=performance.now(),base=tagstackEncode(source);assert.equal(base.decoded,source);const p=ekdysisPlans(source)[0];if(!p){console.log(JSON.stringify({path,A:base.messageTokens,eligible:false}));continue;}const child=tagstackEncode(p.folded),message=p.contract+child.message;assert.equal(child.decoded,p.folded);let out:string;
 if(child.message===p.folded)out=child.message;
 else if(child.message.startsWith('Before ¶ k=v. expand; print only.\n§'))out=chironDecode(child.message.slice(child.message.indexOf('§')));
 else out=readParent(child.message);
 assert.equal(out,p.folded);assert.equal(ekdysisUndo(out,p.depth,p.whole),source);assert.equal(Buffer.from(message).toString(),message);
 console.log(JSON.stringify({path,A:base.messageTokens,B:countTokens(message,'o200k_base'),ms:performance.now()-t,depth:p.depth,whole:p.whole,sites:p.sites,folded:p.folded,message,baseMessage:base.message,childMessage:child.message,sourceRead:true}));}
