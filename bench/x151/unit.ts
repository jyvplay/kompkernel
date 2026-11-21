import assert from 'node:assert/strict';import fs from 'node:fs';
import {diathesisRank,diathesisUnrank,diathesisFold,diathesisRead,diathesisTry,diathesisSelect} from '../../src/lib/omega/diathesis';
import {countTokens} from '../../src/lib/omega/bpe';
let checks=0;function check(ok:unknown,name:string){checks++;assert.ok(ok,name)}
for(let n=1;n<=7;n++){
 const keys=[...'абвгдеж'].slice(0,n);let f=1;for(let i=1;i<=n;i++)f*=i;
 for(let i=0;i<f;i++){const p=diathesisUnrank(keys,BigInt(i));check(diathesisRank(p)===BigInt(i),'rank/unrank');}
}
let threw=false;try{diathesisUnrank(['а','б'],2n)}catch{threw=true}check(threw,'out of range');
threw=false;try{diathesisRank(['а','а'])}catch{threw=true}check(threw,'duplicate keys');
const source='commit a1b2c3d4 is a real-shaped hexadecimal field\r\n';const p=diathesisFold(source);check(p&&p.folded==='commit ~4 is a real-shaped hexadecimal field\r\n','exact local fold');
check(diathesisFold(source+'~')===null,'collision refused');check(diathesisFold(source+'\ud800')===null,'unstable source refused');
const keys=[...'абвгдежзийкл'];const rules=keys.map((k,i)=>k+' '+i).join('');const parent='¶ k=v. expand repeatedly; print only.\n§'+rules+'¶'+p!.folded;
const trial=diathesisTry(source,p!.folded,parent);check(trial,'valid permutation candidate');check(diathesisRead(trial!.message)===source,'complete message reads to source');check(trial!.tokens===countTokens(trial!.message,'o200k_base'),'complete token price');
check(diathesisSelect(source,p!.folded,parent,'x')===null,'strict incumbent rejection');
const selected=diathesisSelect(source,p!.folded,parent,source.repeat(200));check(selected&&diathesisRead(selected.message)===source,'strict incumbent gain using unit-only comparator');
for(const m of [trial!.message.replace('16^7','16^6'),trial!.message.replace('rule 1','rule 999'),trial!.message.slice(0,-1),trial!.message+'~']){
 let accepted=false;try{accepted=diathesisRead(m)===source}catch{}check(!accepted,'adversarial message must not reconstruct original');
}
const corrupt=parent.replace('б 1','ба 1');check(diathesisTry(source,p!.folded,corrupt)===null,'internal dependency rejected');
fs.writeFileSync('bench/x151/receipts/unit-envelope.txt',trial!.message);fs.writeFileSync('bench/x151/receipts/unit-source.txt',source);const out={checks,case:'synthetic unit-only fixture; not a frontier or real-world saving',candidateTokens:trial!.tokens};fs.writeFileSync('bench/x151/receipts/unit.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out));
