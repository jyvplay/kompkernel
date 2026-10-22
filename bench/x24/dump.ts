import fs from 'node:fs';
import {polytroposEncode} from '@/lib/omega/polytropos';
import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const lanes=['bench/holdout-work/kb-article.txt','bench/holdout-work/llm-answer.md','bench/holdout-work/email-thread.txt','bench/holdout/readme.txt','bench/holdout-work/bibliography.txt','bench/holdout-work/meeting-transcript.txt'];
for(const f of lanes){
  const text=fs.readFileSync(f,'utf8');
  const p:any=polytroposEncode(text,enc);
  const wire:string=p.wire;
  fs.writeFileSync('bench/x24/wires/'+f.split('/').pop()+'.wire',wire);
  const pi=wire.indexOf('\u00b6');
  console.log(f.split('/').pop(),'rawChars',text.length,'rawTok',T(text),'| wireChars',wire.length,'wireTok',T(wire),'| tapeChars',pi, 'parent',p.parent??'');
}
