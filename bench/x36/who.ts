import fs from 'node:fs';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_SEP } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const r:any=oikonomiaEncode(t,enc);
  const w=String(r.wire); const cut=w.indexOf(CHIRON_SEP);
  const tape=w.slice(cut+1);
  const gs=new Set<string>(); for(const c of tape) if(c.codePointAt(0)!>127) gs.add(c);
  console.log(f.split('/').pop()!.padEnd(24),'winner',String(r.winner).padEnd(10),'parent',String(r.parent).padEnd(11),
    'rules',String(r.rules).padStart(4),'distinctGlyphs',String(gs.size).padStart(3),
    'wire',String(r.messageTokens).padStart(5),'tapeTok',String(countTokens(tape,enc)).padStart(5));
}
