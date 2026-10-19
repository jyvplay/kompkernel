import fs from 'node:fs';
import { syntomosEncode } from '@/lib/omega/syntomos';
import { chironParseTape } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
for (const f of ['bench/holdout-work/kb-article.txt','bench/holdout-ops/ls-full-iso.txt','bench/holdout-work/email-thread.txt']) {
  const t=fs.readFileSync(f,'utf8');
  const r:any=syntomosEncode(t,enc);
  const si=r.wire.indexOf('¶'); const tape=r.wire.slice(1,si);
  const parsed:any[]=chironParseTape(tape, scriptOfChar(tape[0]) as any)||[];
  console.log('===',f.split('/').pop(),'rules',parsed.length);
  const ex = parsed.map((p:any)=>String(p.body ?? p.expansion ?? ''));
  console.log('  expansions:', ex.map(e=>JSON.stringify(e)).join(' '));
  // near-duplicate pairs: one is a prefix/suffix edit of another
  const pairs:string[]=[];
  for(let i=0;i<ex.length;i++)for(let j=0;j<ex.length;j++){ if(i===j)continue;
    const a=ex[i],b=ex[j]; if(!a||!b)continue;
    if(a!==b && (a.startsWith(b)||b.startsWith(a)||a.endsWith(b)||b.endsWith(a))) pairs.push(`${JSON.stringify(a)}~${JSON.stringify(b)}`);
  }
  console.log('  prefix/suffix-related pairs:', pairs.length, pairs.slice(0,10).join(' '));
}
