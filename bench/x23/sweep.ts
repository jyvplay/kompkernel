import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { stoichosEncode, stoichosDecode, type StoichosParent } from '@/lib/omega/stoichos';
import { lexisEncode, lexisDecode, type LexisParent } from '@/lib/omega/lexis';
import { polytroposEncode } from '@/lib/omega/polytropos';
import { chironDecode } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
const cut=(r:any)=>{const dp:string=r.decoderPrompt;return {wire:String(r.wire),contract:dp.slice(String(r.wire).length+1)};};
const mk=()=>[
  { name:'identity', run:(x:string)=>({wire:x,contract:'Print the text exactly as given.'}), undo:(w:string)=>w },
  { name:'polytropos', run:(x:string)=>cut(polytroposEncode(x,enc)), undo:(w:string)=>chironDecode(w) },
];
const lines=fs.readFileSync('bench/x21/lanes.txt','utf8').split('\n').map(s=>s.trim()).filter(Boolean);
const shard=Number(process.env.SHARD??0), nsh=Number(process.env.NSHARD??1);
const out=fs.createWriteStream(`bench/x23/stoichos-${shard}.jsonl`,{flags:'a'});
for(let i=0;i<lines.length;i++){
  if(i%nsh!==shard) continue;
  const f=lines[i]!;
  try{
    const t=fs.readFileSync(f,'utf8'); const raw=countTokens(t,enc);
    const s=stoichosEncode(t,enc,mk() as any); const sd=stoichosDecode(s.wire,s.decodeConfig);
    const l=lexisEncode(t,enc,mk() as any);    const ld=lexisDecode(l.wire,l.decodeConfig);
    out.write(JSON.stringify({file:f,raw,stoichosM:s.messageTokens,lexisM:l.messageTokens,parent:s.parent,order:s.order,kind:s.decodeConfig.kind,folds:s.folds,dangers:s.dangers,wireTok:s.outTokens,contractTok:s.contractTokens,exact:sd===t&&s.exact,ms:s.ms})+'\n');
    console.log(`${f.split('/').pop()!.padEnd(34)} raw=${String(raw).padStart(5)} STO=${String(s.messageTokens).padStart(5)} LEX=${String(l.messageTokens).padStart(5)} ord=${s.order.padEnd(4)} kind=${s.decodeConfig.kind.padEnd(6)} folds=${String(s.folds).padStart(3)} exact=${sd===t&&s.exact}`);
  }catch(e){ out.write(JSON.stringify({file:f,error:String(e)})+'\n'); console.log(`${f} ERR ${e}`); }
}
out.end();
