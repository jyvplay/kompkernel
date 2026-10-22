import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { stoichosEncode, stoichosDecode, type StoichosParent } from '@/lib/omega/stoichos';
import { polytroposEncode } from '@/lib/omega/polytropos';
import { chironDecode } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
const cut=(r:any)=>{const dp:string=r.decoderPrompt;return {wire:String(r.wire),contract:dp.slice(String(r.wire).length+1)};};
const P: StoichosParent[] = [
  { name:'identity', run:(x)=>({wire:x,contract:'Print the text exactly as given.'}), undo:(w)=>w },
  { name:'polytropos', run:(x)=>cut(polytroposEncode(x,enc)), undo:(w)=>chironDecode(w) },
];
const f=process.argv[2]!;
const t=fs.readFileSync(f,'utf8');
const r=stoichosEncode(t,enc,P);
const dec=stoichosDecode(r.wire,r.decodeConfig);
const dir='bench/x23/receipts/selfdecode'; fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(`${dir}/sample-src.txt`,t);
fs.writeFileSync(`${dir}/sample-message.txt`,r.decoderPrompt);
fs.writeFileSync(`${dir}/sample-decoded-by-codec.txt`,dec);
console.log(JSON.stringify({file:f,raw:r.inTokens,M:r.messageTokens,wireTok:r.outTokens,contractTok:r.contractTokens,parent:r.parent,order:r.order,kind:r.decodeConfig.kind,folds:r.folds,dangers:r.dangers,sentinel:r.sentinel,markSentinels:r.markSentinels,exact:dec===t},null,1));
console.log('--- CONTRACT ---');
console.log(r.decoderPrompt.slice(r.wire.length+1));
