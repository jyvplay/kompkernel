import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { lexisEncode, type LexisParent } from '@/lib/omega/lexis';
import { lakonikosEncode } from '@/lib/omega/lakonikos';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { polytroposEncode } from '@/lib/omega/polytropos';
import { aionEncode } from '@/lib/omega/aion';
import { morpheEncode, morpheDecode } from '@/lib/omega/morphe';
import { chironDecode } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
const cut=(r:any)=>{const dp:string=r.decoderPrompt;return {wire:String(r.wire),contract:dp.slice(String(r.wire).length+1)};};
const P: LexisParent[] = [
  {name:'identity',run:(t)=>({wire:t,contract:'Print the text exactly as given.'}),undo:(w)=>w},
  {name:'lakonikos',run:(t)=>cut(lakonikosEncode(t,enc)),undo:(w)=>chironDecode(w)},
  {name:'daedalus',run:(t)=>cut(daedalusEncode(t,enc)),undo:(w)=>chironDecode(w)},
  {name:'polytropos',run:(t)=>cut(polytroposEncode(t,enc)),undo:(w)=>chironDecode(w)},
  {name:'aion',run:(t)=>cut(aionEncode(t,enc,{budgetMs:60000})),undo:(w)=>chironDecode(w)},
];
// MORPHE needs its fitted config at decode time -> closure parent
function morpheParent(): LexisParent {
  let cfg:any=null;
  return {name:'morphe',run:(t)=>{const r:any=morpheEncode(t,enc);cfg={rules:r.rules,sep:r.sep,after:r.after,tag:r.arm};return cut(r);},undo:(w)=>cfg?morpheDecode(w,cfg):chironDecode(w)};
}
const files = process.argv.slice(2);
for (const f of files) {
  const t = fs.readFileSync(f,'utf8');
  const raw = countTokens(t, enc);
  const parents = P.slice();
  if (process.env.LEX_MORPHE === '1') parents.push(morpheParent());
  const r = lexisEncode(t, enc, parents);
  console.log(`${f.split('/').pop()!.padEnd(24)} raw=${String(raw).padStart(4)} lexisM=${String(r.messageTokens).padStart(4)} Δ=${String(r.messageTokens-raw).padStart(5)} par=${r.parent.padEnd(10)} ord=${r.order.padEnd(4)} folds=${String(r.folds).padStart(3)} dang=${String(r.dangers).padStart(3)} exact=${r.exact}`);
}
