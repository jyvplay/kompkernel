import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { buildOn } from '@/lib/omega/ariadne';
import { chironSeparators } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
const FULL={budgetMs:8000,maxEvals:400000,restarts:2,noBlocks:false,noMacros:false} as any;
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const seps=chironSeparators(t);
  for(const sep of seps.slice(0,3)){
    try{
      const o:any=buildOn(t,enc,sep,{...FULL},Date.now()+20000);
      if(!o){ console.log(f.split('/').pop()!.padEnd(24),JSON.stringify(sep).padEnd(6),'null'); continue; }
      console.log(f.split('/').pop()!.padEnd(24),JSON.stringify(sep).padEnd(6),
        'blocks',String(o.g.blocks.length).padStart(3),
        'lists',String(o.g.lists.length).padStart(3),
        'seq',String(o.g.seq.length).padStart(4),
        'tokens',String(o.tokens).padStart(5));
    }catch(e:any){ console.log(f.split('/').pop()!.padEnd(24),JSON.stringify(sep).padEnd(6),'ERR',String(e.message).slice(0,60)); }
  }
}
