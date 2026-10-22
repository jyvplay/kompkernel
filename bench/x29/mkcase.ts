import fs from 'node:fs';
import { synkopeEncode } from '@/lib/omega/synkope';
import { syntomosEncode } from '@/lib/omega/syntomos';
const enc='o200k_base' as any;
const lanes=(process.env.LANES||'bench/holdout-mk/dump.sql,bench/holdout-work/kb-article.txt,bench/holdout-ops/git-log-iso.txt,bench/z11/fresh/csv-8.csv').split(',');
const cases:any[]=[];
for(const f of lanes){
  const t=fs.readFileSync(f,'utf8');
  const p:any=syntomosEncode(t,enc), r:any=synkopeEncode(t,enc);
  cases.push({name:f.split('/').pop()!,file:f,message:r.contract+'\n'+r.wire,
    parentMessage:p.contract+'\n'+p.wire,expect:t,delta:r.messageTokens-p.messageTokens,rungs:r.rungs});
  fs.mkdirSync('bench/x29/receipts',{recursive:true});
  fs.writeFileSync('bench/x29/receipts/'+f.split('/').pop()!+'.message.txt', r.contract+'\n'+r.wire);
  console.log(f.split('/').pop()!.padEnd(22),'delta',String(r.messageTokens-p.messageTokens).padStart(4),'rungs',JSON.stringify(r.rungs));
}
fs.writeFileSync('bench/x29/cases.json',JSON.stringify(cases,null,1));
console.log('cases written:',cases.length);
