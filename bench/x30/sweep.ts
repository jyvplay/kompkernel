import fs from 'node:fs';
import { tachosEncode } from '@/lib/omega/tachos';
import { synkopeEncode } from '@/lib/omega/synkope';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').split('\n').map(s=>s.trim()).filter(Boolean);
let rs=0,rt=0,rr=0,imp=0;
for(const f of lanes){
  if(!fs.existsSync(f)){ console.log('MISSING',f); continue; }
  const t=fs.readFileSync(f,'utf8');
  const p:any=synkopeEncode(t,enc);
  const t0=Date.now(); const r:any=tachosEncode(t,enc); const ms=Date.now()-t0;
  const d=r.messageTokens-p.messageTokens;
  const ok = (()=>{ try{ const {chironDecode}=require('@/lib/omega/chiron'); const {symplokeDecode}=require('@/lib/omega/symploke');
     return r.winner==='bootstrap' ? symplokeDecode(r.wire,{stats:undefined,undo:(w:string)=>chironDecode(w)})===t
                                   : symplokeDecode(r.wire,{stats:r.stats,order:r.order,undo:(w:string)=>chironDecode(w)})===t; }catch(e){ return false; } })();
  rs+=p.messageTokens; rt+=r.messageTokens; rr+=r.inTokens; if(d<0)imp++;
  const row={lane:f.split('/').pop(),raw:r.inTokens,synkope:p.messageTokens,tachos:r.messageTokens,delta:d,winner:r.winner,rules:r.rules,ms,exact:ok};
  fs.appendFileSync('bench/x30/sweep.jsonl',JSON.stringify(row)+'\n');
  console.log(String(row.lane).padEnd(26),'raw',String(row.raw).padStart(5),'syn',String(row.synkope).padStart(5),
    'tac',String(row.tachos).padStart(5),'d',String(d).padStart(4),row.winner.padEnd(9),'ms',String(ms).padStart(7),'exact',ok);
}
console.log(`TOTALS raw ${rr} synkope ${rs} tachos ${rt} delta ${rt-rs} improved ${imp}/${lanes.length}`);
console.log('ALLDONE');
