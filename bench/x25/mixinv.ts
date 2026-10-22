import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
console.log('one-token ASCII chars outside [A-Za-z0-9]:');
const rows:string[]=[];
for(let cp=0x21;cp<0x7f;cp++){
  const c=String.fromCharCode(cp);
  if(/[A-Za-z0-9]/.test(c)) continue;
  if(T(c)===1) rows.push(JSON.stringify(c));
}
console.log(rows.join(' '));
console.log('\ntwo-char probes (1 token?):');
const two:string[]=[];
for(let a=0x21;a<0x7f;a++) for(let b=0x21;b<0x7f;b++){
  const s=String.fromCharCode(a)+String.fromCharCode(b);
  if(/[A-Za-z0-9]/.test(s)) continue;
  if(T(s)===1) two.push(JSON.stringify(s));
}
console.log(two.length,'such pairs; sample:',two.slice(0,60).join(' '));
console.log('\nthree-char probes:');
let three=0; const ex:string[]=[];
for(let a=0x21;a<0x7f;a++) for(let b=0x21;b<0x7f;b++) for(let c=0x21;c<0x7f;c++){
  const s=String.fromCharCode(a)+String.fromCharCode(b)+String.fromCharCode(c);
  if(/[A-Za-z0-9]/.test(s)) continue;
  if(T(s)===1){three++; if(ex.length<40) ex.push(JSON.stringify(s));}
}
console.log(three,'such triples; sample:',ex.join(' '));
