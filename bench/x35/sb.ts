import fs from 'node:fs';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { pyknosisEncode } from '@/lib/omega/pyknosis';
import { syncopeEncode, syncopeRoundTrip } from '@/lib/omega/syncope';
const enc='o200k_base' as any;
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const a:any=oikonomiaEncode(t,enc);
  const b:any=pyknosisEncode(t,enc);
  let c:any=null,err='';
  try{ c=syncopeEncode(t,enc); }catch(e){ err=(e as Error).message.slice(0,40); }
  if(!c){ console.log(f.split('/').pop()!.padEnd(26),'ERR',err); continue; }
  const ok = c.syncope ? syncopeRoundTrip(t,enc) : true;
  console.log(f.split('/').pop()!.padEnd(26),
    'oiko',String(a.messageTokens).padStart(5),
    'pyk',String(b.messageTokens).padStart(5),
    'syncope',String(c.messageTokens).padStart(5),
    '| vs pyk',String(c.messageTokens-b.messageTokens).padStart(5),
    '| fired',c.syncope?'Y':'n','runs',String(c.syncopeRuns).padStart(3),'seps',String(c.syncopeSeps).padStart(3),
    '|',c.syncopeClause.slice(0,60),
    ok?'EXACT':'*** MISMATCH ***');
}
