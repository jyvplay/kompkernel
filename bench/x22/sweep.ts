import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { lexisEncode, lexisDecode, type LexisParent } from '@/lib/omega/lexis';
import { lakonikosEncode } from '@/lib/omega/lakonikos';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { polytroposEncode } from '@/lib/omega/polytropos';
import { chironDecode } from '@/lib/omega/chiron';
const cut=(r:any)=>{const dp:string=r.decoderPrompt;return {wire:String(r.wire),contract:dp.slice(String(r.wire).length+1)};};
const PARENTS: LexisParent[] = [
  { name:'identity', run:(x)=>({wire:x,contract:'Print the text exactly as given.'}), undo:(w)=>w },
  { name:'lakonikos', run:(x)=>cut(lakonikosEncode(x,enc)), undo:(w)=>chironDecode(w) },
  { name:'daedalus', run:(x)=>cut(daedalusEncode(x,enc)), undo:(w)=>chironDecode(w) },
  { name:'polytropos', run:(x)=>cut(polytroposEncode(x,enc)), undo:(w)=>chironDecode(w) },
];
const enc='o200k_base' as any;
const lines = fs.readFileSync('bench/x21/lanes.txt','utf8').split('\n').map(s=>s.trim()).filter(Boolean);
const shard = Number(process.env.SHARD ?? 0), nsh = Number(process.env.NSHARD ?? 1);
const out = fs.createWriteStream(`bench/x22/lexis-${shard}.jsonl`, {flags:'a'});
for (let i=0;i<lines.length;i++){
  if (i % nsh !== shard) continue;
  const f=lines[i]!;
  try{
    const t=fs.readFileSync(f,'utf8');
    const raw=countTokens(t,enc);
    const r=lexisEncode(t,enc,PARENTS);
    const dec=lexisDecode(r.wire,r.decodeConfig);
    out.write(JSON.stringify({file:f,raw,lexisM:r.messageTokens,parent:r.parent,order:r.order,folds:r.folds,dangers:r.dangers,wireTok:r.outTokens,contractTok:r.contractTokens,exact:dec===t&&r.exact,ms:r.ms})+'\n');
    console.log(`${f.split('/').pop()!.padEnd(34)} raw=${String(raw).padStart(5)} lexis=${String(r.messageTokens).padStart(5)} par=${r.parent.padEnd(10)} ord=${r.order.padEnd(4)} folds=${String(r.folds).padStart(3)} exact=${dec===t&&r.exact}`);
  }catch(e){ out.write(JSON.stringify({file:f,error:String(e)})+'\n'); console.log(`${f} ERROR ${e}`); }
}
out.end();
