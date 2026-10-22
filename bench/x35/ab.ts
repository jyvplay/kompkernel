import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { ariadneEncode } from '@/lib/omega/ariadne';
const enc='o200k_base' as any;
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const raw=countTokens(t,enc);
  const wB:any=ariadneEncode(t,enc,{budgetMs:Number(process.env.MS||8000), noBlocks:false} as any);
  const nB:any=ariadneEncode(t,enc,{budgetMs:Number(process.env.MS||8000), noBlocks:true} as any);
  const wb=wB.messageTokens??countTokens(String(wB.wire),enc);
  const nb=nB.messageTokens??countTokens(String(nB.wire),enc);
  console.log(f.split('/').pop()!.padEnd(26),'raw',String(raw).padStart(5),
    'blocksON',String(wb).padStart(5),'blocksOFF',String(nb).padStart(5),
    'delta',String(wb-nb).padStart(5), (wb<nb?'  BLOCKS WIN':wb>nb?'  blocks lose':'  tie'));
}
