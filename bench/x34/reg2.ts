import fs from 'node:fs';
import { codecEntries } from '@/lib/omega/registry';
const enc='o200k_base' as any;
const entries=codecEntries();
const e=entries.find(x=>x.key==='pyknosis');
console.log('registered:',!!e,'| position after oikonomia:',
  entries.findIndex(x=>x.key==='pyknosis')-entries.findIndex(x=>x.key==='oikonomia'));
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const r=await e!.run(t,enc);
  const ok=r.decoded===t;
  console.log(f.split('/').pop()!.padEnd(28),'oneChat',String(r.oneChat).padStart(5),
    'DECODED-EXACT',ok,'|',r.note.slice(0,90));
}
