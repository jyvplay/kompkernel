import fs from 'node:fs';
import { syncopeEncode } from '@/lib/omega/syncope';
import { anadiplosisEncode, anadiplosisRoundTrip } from '@/lib/omega/anadiplosis';
const enc='o200k_base' as any;
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const b:any=syncopeEncode(t,enc);
  const a:any=anadiplosisEncode(t,enc);
  const ok=anadiplosisRoundTrip(t,enc);
  console.log(f.split('/').pop()!.padEnd(26),'syncope',String(b.messageTokens).padStart(5),
    '-> ana',String(a.messageTokens).padStart(5),'=>',String(a.messageTokens-b.messageTokens).padStart(5),
    '| fired',a.anadiplosis?'Y':'n','spans',String(a.anadiplosisSpans).padStart(3),
    ok?'EXACT':'*** MISMATCH ***');
}
