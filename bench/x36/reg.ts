import fs from 'node:fs';
import { codecEntries } from '@/lib/omega/registry';
const enc='o200k_base' as any;
const entries=codecEntries(); const keys=entries.map(x=>x.key);
console.log('anadiplosis registered:',keys.includes('anadiplosis'),
  '| idx ana',keys.indexOf('anadiplosis'),'oikonomia',keys.indexOf('oikonomia'),
  'pyknosis',keys.indexOf('pyknosis'),'syncope',keys.indexOf('syncope'));
const e=entries.find(x=>x.key==='anadiplosis')!;
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const r=await e.run(t,enc);
  console.log(f.split('/').pop()!.padEnd(26),'oneChat',String(r.oneChat).padStart(5),
    r.decoded===t?'DECODED-EXACT':'*** MISMATCH ***','|',r.note.slice(0,95));
}
