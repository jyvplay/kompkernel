import fs from 'node:fs';
import {aetosEncode,aetosDecode} from '@/lib/omega/aetos';
import {chironDecode} from '@/lib/omega/chiron';
import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
const only=process.env.IDX?process.env.IDX.split(',').map(Number):null;
const out='bench/x25/aetos.jsonl';
const PSEPHOS:Record<string,number>=JSON.parse(fs.readFileSync('bench/x25/psephos_frontier.json','utf8'));
for(let i=0;i<lanes.length;i++){
  if(only&&!only.includes(i)) continue;
  const f=lanes[i]; const t=fs.readFileSync(f,'utf8');
  const t0=Date.now();
  let r:any;
  try{ r=aetosEncode(t,enc); }catch(e){ console.log(i,'ERR',e); continue; }
  const undo=(w:string)=>r.parent==='identity'?w:chironDecode(w);
  let ok=false;
  try{ ok=aetosDecode(r.wire,{stats:r.stats,order:r.order,undo})===t; }catch(e){}
  const wireTok=countTokens(r.wire,enc);
  const ps=PSEPHOS[f.split('/').pop()!];
  const line=JSON.stringify({lane:f,base:r.inTokens,aetos:r.messageTokens,wireTok,
    contractTok:r.messageTokens-wireTok,parent:r.parent,order:r.order,shapes:r.shapes,
    exact:ok,psephos:ps,delta:ps?r.messageTokens-ps:null,ms:Date.now()-t0});
  fs.appendFileSync(out,line+'\n');
  console.log(String(i).padStart(2),f.split('/').pop()!.padEnd(40),
    'in',String(r.inTokens).padStart(5),'aetos',String(r.messageTokens).padStart(5),
    'psephos',String(ps??'?').padStart(5),'delta',String(ps?r.messageTokens-ps:'?').padStart(5),
    'exact',ok,r.parent+'/'+r.order,(r.shapes.join(' ')||'-'));
}
console.log('DONE');
