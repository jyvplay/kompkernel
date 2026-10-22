import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { stoichosEncode, stoichosDecode, type StoichosParent } from '@/lib/omega/stoichos';
import { lexisEncode, lexisDecode, type LexisParent } from '@/lib/omega/lexis';
import { polytroposEncode } from '@/lib/omega/polytropos';
import { chironDecode } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
const cut=(r:any)=>{const dp:string=r.decoderPrompt;return {wire:String(r.wire),contract:dp.slice(String(r.wire).length+1)};};
const SP: StoichosParent[] = [
  { name:'identity', run:(x)=>({wire:x,contract:'Print the text exactly as given.'}), undo:(w)=>w },
  { name:'polytropos', run:(x)=>cut(polytroposEncode(x,enc)), undo:(w)=>chironDecode(w) },
];
const LP: LexisParent[] = [
  { name:'identity', run:(x)=>({wire:x,contract:'Print the text exactly as given.'}), undo:(w)=>w },
  { name:'polytropos', run:(x)=>cut(polytroposEncode(x,enc)), undo:(w)=>chironDecode(w) },
];
for(const f of process.argv.slice(2)){
  const t=fs.readFileSync(f,'utf8'); const raw=countTokens(t,enc);
  const p:any=polytroposEncode(t,enc);
  const s=stoichosEncode(t,enc,SP); const sdec=stoichosDecode(s.wire,s.decodeConfig);
  const l=lexisEncode(t,enc,LP);    const ldec=lexisDecode(l.wire,l.decodeConfig);
  console.log(`${f.split('/').pop()!.padEnd(24)} raw=${String(raw).padStart(4)} poly=${String(p.messageTokens).padStart(4)} lexis=${String(l.messageTokens).padStart(4)} STOICH=${String(s.messageTokens).padStart(4)} Δpoly=${String(s.messageTokens-p.messageTokens).padStart(4)} ord=${s.order.padEnd(4)} marks=[${s.config.marks.join('')}] lm=${s.config.lineMarks?1:0} ln=${s.config.listNum?1:0} folds=${String(s.folds).padStart(3)} dang=${String(s.dangers).padStart(3)} sent=${s.sentinel??'-'} exact=${sdec===t}`);
}
