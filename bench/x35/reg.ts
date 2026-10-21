import fs from 'node:fs';
import { codecEntries } from '@/lib/omega/registry';
const enc='o200k_base' as any;
const entries=codecEntries();
const keys=entries.map(x=>x.key);
console.log('syncope registered:',keys.includes('syncope'),
  '| idx syncope',keys.indexOf('syncope'),'oikonomia',keys.indexOf('oikonomia'),'pyknosis',keys.indexOf('pyknosis'));
const e=entries.find(x=>x.key==='syncope')!;
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const r=await e.run(t,enc);
  const ok=r.decoded===t;
  console.log(f.split('/').pop()!.padEnd(28),'oneChat',String(r.oneChat).padStart(5),
    ok?'DECODED-EXACT':'*** MISMATCH ***','|',r.note.slice(0,100));
}
