import fs from 'node:fs';
import { timemaEncode } from '@/lib/omega/timema';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const f=process.env.F||'';
const t=fs.readFileSync(f,'utf8');
const r:any=timemaEncode(t,enc);
const wire:string=r.wire;
const ct=r.contract||'';
console.log('LANE',f.split('/').pop(),'raw',countTokens(t,enc),'msg',r.messageTokens,'rules',r.rules);
console.log('  contract        ',String(countTokens(ct,enc)).padStart(5),'tok  ',String(ct.length).padStart(6),'ch');
// split glossary vs tape: find CHIRON_START / SEP
const S=0;
console.log('  wire len',wire.length,'tok',countTokens(wire,enc));
// find the glossary/tape split by locating the tape separator
for (const sep of ['\u0002','\u0003','\u241F','\u001F','||','~~']) {
  const i=wire.indexOf(sep);
  if(i>=0) console.log('   sep found',JSON.stringify(sep),'at',i);
}
console.log('  head:',JSON.stringify(wire.slice(0,120)));
const tail=wire.slice(-400);
console.log('  tail:',JSON.stringify(tail));
