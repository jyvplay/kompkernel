import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
import {psephosEncode,psephosDecode} from '@/lib/omega/psephos';
const enc='o200k_base' as any;
for(const f of (process.env.F||'').split(',').filter(Boolean)){
  const text=fs.readFileSync(f,'utf8');
  const r:any=psephosEncode(text,enc);
  const dec=psephosDecode(r.wire,r.decodeConfig);
  console.log(f.split('/').pop()!.padEnd(34),'raw',String(r.inTokens).padStart(5),'M',String(r.messageTokens).padStart(5),r.parent.padEnd(18),'exact',dec===text, '|',r.notes.slice(0,60));
}
