import assert from 'node:assert/strict';import fs from 'node:fs';import {horionPlans,horionRead,horionRestore,horionSelect,HORION_CONTRACT} from '../../src/lib/omega/horion';
let checks=0;const eq=(a:unknown,b:unknown)=>{assert.deepEqual(a,b);checks++};
const source=fs.readFileSync('bench/x147/heldout/geyser.csv','utf8');
for(let i=0;i<240;i++) {
 const t=i%3,a=(t+1)%3,headers=['x','y','z'],rows=[headers];
 for(let j=0;j<12;j++){const row=['id'+j,'id'+j,'id'+j];row[a]=(BigInt(j-6)*1000000000000000000n).toString()+'.'+String(i).padStart(3,'0');row[t]=j<6?'below':'above';rows.push(row)}
 const s=rows.map(r=>r.join(',')).join('\n')+(i%2?'\n':'');const p=horionPlans(s);eq(p.length,1);eq(horionRead(p[0].message),s);eq(Buffer.from(p[0].message).toString('utf8'),p[0].message);
 eq(horionSelect(s,'short'),'short');
}
const p=horionPlans(source)[0];eq(horionRead(p.message),source);
for(const s of [source.replace(/\n/g,'\r\n'),source+'\n',source.replace('3.6','"3.6"'),source.replace('kind','ki\ud800nd'),'x,y\n1,a\n',source.repeat(15)])eq(horionPlans(s),[]);
// Equal numeric values cannot predict unequal labels, including negative zero.
const conflicting='n,label\n'+['-0,a','0,b','0.0,a','-0.0,b','0,a','0,b','0,a','0,b'].join('\n');eq(horionPlans(conflicting),[]);
for(const spec of [null,[],[2,'kind',1,'NaN','a','b'],[2,'kind',1,'1e2','a','b'],[3,'kind',1,'68','short','long'],[2,'kind',2,'68','short','long'],[2,'kind',1,'68','a','a'],[2,'a\nb',1,'68','a','b'],[2,'kind',1,'9'.repeat(40),'a','b']]){assert.throws(()=>horionRestore(p.reduced,spec));checks++}
for(const msg of ['',p.message.replace(HORION_CONTRACT,''),HORION_CONTRACT+'[]',HORION_CONTRACT+'null\n'+p.reduced,HORION_CONTRACT+'[]\n'+p.reduced]){assert.throws(()=>horionRead(msg));checks++}
// Patch-targeted precision and negative decimal comparison checks.
for(const [n,expected] of [['-0.001','lo'],['0','hi'],['-0','hi'],['0.000','hi']]){
 const s='n\n'+Array(8).fill(n).join('\n');eq(horionRestore(s,[1,'label',0,'0','lo','hi']),'n,label\n'+Array(8).fill(n+','+expected).join('\n'));
}
const canonical=fs.readFileSync('bench/x109/lanes29.txt','utf8').trim().split('\n').map(path=>({path,plans:horionPlans(fs.readFileSync(path,'utf8')).length}));
fs.writeFileSync('bench/x147/receipts/unit.json',JSON.stringify({checks,canonical},null,2));console.log({checks,canonicalEligible:canonical.filter(x=>x.plans).length});
