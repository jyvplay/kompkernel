import fs from 'node:fs';
import { heuresisEncode } from '@/lib/omega/heuresis';
import { chironDecode } from '@/lib/omega/chiron';
import { symplokeDecode } from '@/lib/omega/symploke';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const taxes=(process.env.TAXES||'0,30,25,20,17,12,6').split(',').map(Number);
const lanes=(process.env.LANES||'').split(',').filter(Boolean);
const res: Record<string, number[]> = {};
for (const f of lanes){
  const t=fs.readFileSync(f,'utf8'); const raw=countTokens(t,enc);
  const row:number[]=[];
  for (const tax of taxes){
    process.env.OMEGA_CONTRACT_TAX = tax===0 ? '' : String(tax);
    const r:any=heuresisEncode(t,enc);
    const dec = r.winner==='bootstrap'
      ? symplokeDecode(r.wire,{stats:undefined as any,undo:(w:string)=>chironDecode(w)})
      : symplokeDecode(r.wire,{stats:r.stats,order:r.order,undo:(w:string)=>chironDecode(w)});
    if(dec!==t) console.log('!!! MISMATCH', f, tax);
    row.push(r.messageTokens);
  }
  res[f]=row;
  console.log(f.split('/').pop()!.padEnd(24),'raw',String(raw).padStart(5),'|',row.map((v,i)=>`t${taxes[i]}:${v}`).join(' '));
}
console.log('\nTAXES header:',taxes.join('\t'));
