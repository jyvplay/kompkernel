import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {countTokens} from '../../src/lib/omega/bpe';
import {ptychePlan,ptycheUndo,PTYCHE_KEY} from '../../src/lib/omega/ptyche';
import {readParent} from '../x135/reader';
const ct=(s:string)=>countTokens(s,'o200k_base');
const rotation=fs.readFileSync('bench/x135/receipts/rotation.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
for(const r of rotation){
 const pos=r.message.indexOf('\n'),outer=r.message.slice(0,pos),parent=r.message.slice(pos+1);
 if(!parent.startsWith('¶ k=v. expand repeatedly; print only.\n'))continue;
 const inner=parent.slice(parent.indexOf('\n')+1),marker=/parts at (.)/.exec(outer)?.[1];
 const key=marker?`¶ k=v; expand repeatedly; swap parts at ${marker}, omitting ${marker}; print only.\n`:'¶ k=v; expand repeatedly; move final line (newline included) to front; print only.\n';
 const message=key+inner,decoded=readParent(parent);let out:string;
 if(marker){const parts=decoded.split(marker);assert.equal(parts.length,2);out=parts[1]+parts[0];}
 else{assert.ok(decoded.endsWith('\n'));const at=decoded.lastIndexOf('\n',decoded.length-2)+1;out=decoded.slice(at)+decoded.slice(0,at);}
 assert.equal(out,fs.readFileSync(r.path,'utf8'));
 console.log(JSON.stringify({kind:'fused-rotation',path:r.path,cut:r.cut,A:r.A,B:ct(message),delta:ct(message)-r.A,message,sourceExact:true}));
}
for(const r of fs.readFileSync('bench/x135/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l))){
 const text=fs.readFileSync(r.path,'utf8');
 for(const maxPatches of [0,3]){const plan=ptychePlan(text,'o200k_base',maxPatches);if(!plan)continue;
 assert.equal(ptycheUndo(plan.folded),text);
 console.log(JSON.stringify({kind:'layout-plan',path:r.path,A:r.tokens,raw:ct(text),folded:ct(plan.folded),uncompressedMessage:ct(PTYCHE_KEY+plan.folded),maxPatches,...plan}));}
}
