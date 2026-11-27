import fs from 'node:fs';import assert from 'node:assert/strict';import {encode} from 'gpt-tokenizer/encoding/o200k_base';
import {dipigiPlans,dipigiUndo,dipigiRead,DIPIGI_KEY} from '../../src/lib/omega/dipigi';
import {geitonPlans,geitonUndo} from '../../src/lib/omega/geiton';import {desmiPlans,desmiUndo} from '../../src/lib/omega/desmi';
import {diamerisPlans,diamerisUndo} from '../../src/lib/omega/diameris';import {apousiaPlans,apousiaUndo} from '../../src/lib/omega/apousia';
import {diadochiPlans,diadochiUndo} from '../../src/lib/omega/diadochi';import {ropiPlans,ropiTransform} from '../../src/lib/omega/ropi';
let checks=0;const pairs:any[]=[];
const emit=(rows:any[],body:string)=>JSON.stringify([rows,body]);
for(const middle of ['', 'middle', '000', '_', '.', '/', '-'])for(let p=0;p<=6;p++)for(let s=0;s<=6;s++){
 const out='prefix'.slice(0,p)+middle+(s?'suffix'.slice(-s):'');if(!out||['prefix','suffix'].includes(out))continue;
 const folded=emit(['prefix','suffix',[1,p,middle,2,s]],'😀\r\n~3;\t~1;\0');const source='😀\r\n'+out+'\tprefix\0';
 assert.equal(dipigiUndo(folded),source);assert.equal(dipigiRead(DIPIGI_KEY+folded),source);pairs.push({folded,source});checks+=2;
}
const attacks=['null','[]','[[],"~1;"]',emit(['a',[2,1,'',1,0]],'~2;'),emit(['a',[1,2,'',1,0]],'~2;'),emit(['a',[1,0,'',1,2]],'~2;'),emit(['a',[1,-1,'',1,0]],'~2;'),emit(['a',[1,0.5,'x',1,0]],'~2;'),emit(['a',[true,1,'x',1,0]],'~2;'),emit(['a',[1,0,'🙂',1,0]],'~2;'),emit(['a','a'],'~1;'),emit(['a'],'~0;'),emit(['a'],'~01;'),emit(['a'],'~65;'),emit(['a'],'~1'),emit(['a'],'~x;'),emit(['a'],'\ud800'),emit(['a'.repeat(97)],'~1;'),emit(['a'.repeat(96)],'~1;'.repeat(1000))];
for(const s of attacks){assert.throws(()=>dipigiUndo(s));checks++;}
assert.deepEqual(dipigiPlans('literal ~ marker'),[]);assert.deepEqual(dipigiPlans('<|endoftext|>'),[]);checks+=2;
const files=[...fs.readFileSync('bench/x190/lanes.txt','utf8').trim().split('\n'),...JSON.parse(fs.readFileSync('bench/x182/receipts/heldout-sources.json','utf8')).map((x:any)=>x.file),...JSON.parse(fs.readFileSync('bench/x184/receipts/heldout-sources.json','utf8')).map((x:any)=>x.file)],rows:any[]=[];
for(const path of files){const source=fs.readFileSync(path,'utf8'),raw=encode(source).length;
 for(const force of [false,true]){const plans=dipigiPlans(source,'o200k_base',force);for(const p of plans){assert.equal(dipigiUndo(p.folded),source);assert.equal(encode(p.message).length,p.tokens);checks++;}rows.push({path,family:'dipigi',force,raw,plans});}
 const others:[string,any[],(p:any)=>string][]=[['geiton',geitonPlans(source),p=>geitonUndo(p.folded)],['desmi',desmiPlans(source),p=>desmiUndo(p.folded)],['diameris',diamerisPlans(source),p=>diamerisUndo(p.folded)],['apousia',apousiaPlans(source),p=>apousiaUndo(p.folded,p.k)],['diadochi',diadochiPlans(source),p=>diadochiUndo(p.folded)],['ropi',ropiPlans(source),p=>ropiTransform(p.folded,p.n,p.k,true)]];
 for(const [family,plans,undo] of others){for(const p of plans){assert.equal(undo(p),source);checks++;}rows.push({path,family,raw,plans:plans.map(p=>({tokens:p.tokens}))});}
}
fs.writeFileSync('bench/x190/receipts/unit-pairs.json',JSON.stringify(pairs));fs.writeFileSync('bench/x190/receipts/attacks.json',JSON.stringify(attacks));fs.writeFileSync('bench/x190/receipts/screen.json',JSON.stringify({checks,sources:files.length,rows},null,2));
console.log({checks,sources:files.length,dipigiPlans:rows.filter(x=>x.family==='dipigi').reduce((n,x)=>n+x.plans.length,0),twoParentPlans:rows.filter(x=>x.family==='dipigi').flatMap(x=>x.plans).filter(p=>p.twoParents>0).length});
