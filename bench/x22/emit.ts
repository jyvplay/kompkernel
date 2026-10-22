import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { lexisEncode, lexisDecode, type LexisParent } from '@/lib/omega/lexis';
import { lakonikosEncode } from '@/lib/omega/lakonikos';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { polytroposEncode } from '@/lib/omega/polytropos';
import { chironDecode } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
const cut=(r:any)=>{const dp:string=r.decoderPrompt;return {wire:String(r.wire),contract:dp.slice(String(r.wire).length+1)};};
const PARENTS: LexisParent[] = [
  { name:'identity', run:(x)=>({wire:x,contract:'Print the text exactly as given.'}), undo:(w)=>w },
  { name:'lakonikos', run:(x)=>cut(lakonikosEncode(x,enc)), undo:(w)=>chironDecode(w) },
  { name:'daedalus', run:(x)=>cut(daedalusEncode(x,enc)), undo:(w)=>chironDecode(w) },
  { name:'polytropos', run:(x)=>cut(polytroposEncode(x,enc)), undo:(w)=>chironDecode(w) },
];
const f = process.argv[2]!;
const t = fs.readFileSync(f,'utf8');
const r = lexisEncode(t, enc, PARENTS);
const dec = lexisDecode(r.wire, r.decodeConfig);
const dir = 'bench/x22/receipts/selfdecode';
fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(`${dir}/sample-src.txt`, t);          // full lane (byte-exact source)
fs.writeFileSync(`${dir}/sample-message.txt`, r.decoderPrompt);
fs.writeFileSync(`${dir}/sample-decoded-by-codec.txt`, dec);
console.log(JSON.stringify({file:f,raw:r.inTokens,lexisM:r.messageTokens,wireTok:r.outTokens,contractTok:r.contractTokens,parent:r.parent,order:r.order,folds:r.folds,dangers:r.dangers,exact:dec===t,ms:r.ms},null,1));
console.log('--- CONTRACT ---');
console.log(r.decoderPrompt.slice(r.wire.length+1));
