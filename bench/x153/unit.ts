import fs from 'node:fs';import assert from 'node:assert/strict';import {kenomaPlan,kenomaUndo,kenomaRead,kenomaSelect,KENOMA_KEY} from '../../src/lib/omega/kenoma';
let checks=0;const eq=(a:unknown,b:unknown)=>{assert.deepEqual(a,b);checks++};
for(let n=1;n<=50;n++)for(const eol of ['\n','\r\n'])for(const final of ['',eol]){
 const s=JSON.stringify({a:Array.from({length:n},(_,i)=>({i,s:'} ] \\" 🚀',a:[i,null]})),z:{}},null,2).replace(/\n/g,eol)+final;
 const p=kenomaPlan(s);assert.ok(p);eq(kenomaUndo(p.folded),s);eq(kenomaRead(KENOMA_KEY+p.folded),s);eq(kenomaSelect(s,p.folded,'x',x=>x),null);
}
for(const s of ['[\n]\n','[\n]','{\n "n":1e309,\n "n":-0,\n "s":"\\ud800"\n}\n','{\n\t"x": [\n\t\t1\n\t]\n}\n']){const p=kenomaPlan(s);if(p)eq(kenomaUndo(p.folded),s);else eq(s,'[\n]');}
for(const s of ['{\n\n"a":1\n}\n','{\n"a":1\n,\n"b":2\n}\n','[\r1\r]\n','[1,]\n','[}\n','{"a":"\n"}\n','[\n1\n]\ud800','['.repeat(129)+'0'+']'.repeat(129)+'\n'])eq(kenomaPlan(s),null);
for(const s of ['\n','[\n','[\n\n\n','[\n1\n\n\n']){let threw=false;try{kenomaUndo(s)}catch{threw=true}eq(threw,true);}
const s='[\n"'+'x'.repeat(49994)+'"\n]\n';eq(s.length,50001);eq(kenomaPlan(s),null);
fs.writeFileSync('bench/x153/receipts/unit.json',JSON.stringify({checks,passed:true}));console.log({checks});
