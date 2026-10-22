import fs from 'node:fs';
import { metathesisEncode, metathesisDecode } from '@/lib/omega/metathesis';
import { chironDecode } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
for (const f of (process.env.F||'').split(',').filter(Boolean)) {
  const t=fs.readFileSync(f,'utf8');
  const wires:string[]=[]; const toks:number[]=[]; let oks=true;
  for (let k=0;k<3;k++){
    const r=metathesisEncode(t,enc);
    wires.push(r.wire); toks.push(r.messageTokens);
    const undo=(w:string)=>(r.parent==='identity'?w:chironDecode(w));
    try{ if(metathesisDecode(r.wire,{stats:r.stats,order:r.order,undo})!==t) oks=false; }catch(e){oks=false;}
  }
  console.log(f.split('/').pop()!.padEnd(34),'msgs',JSON.stringify(toks),
    '| identical wires:', wires[0]===wires[1] && wires[1]===wires[2],
    '| all exact:',oks);
}
