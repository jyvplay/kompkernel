import fs from 'node:fs';
import { chironEncode } from '@/lib/omega/chiron';
import { symplokeEncode } from '@/lib/omega/symploke';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
for (const f of (process.env.F||'').split(',').filter(Boolean)) {
  const text=fs.readFileSync(f,'utf8');
  const s=symplokeEncode(text,enc);
  const out:string[]=[];
  for (const [tag,o] of [
    ['blocks-only', {noBlocks:false,noMacros:true,budgetMs:20000}],
    ['macros-only', {noBlocks:true,noMacros:false,budgetMs:20000}],
    ['full',        {noBlocks:false,noMacros:false,budgetMs:20000}],
  ] as any) {
    try {
      const r:any=chironEncode(text,enc,o);
      out.push(`${tag}=${r.messageTokens}(b${r.blocks},l${r.lists},${r.exact?'ok':'BAD'})`);
    } catch(e){ out.push(`${tag}=ERR`); }
  }
  console.log(f.split('/').pop()!.padEnd(34),'symploke',String(s.messageTokens).padStart(5),'|',out.join('  '));
}
