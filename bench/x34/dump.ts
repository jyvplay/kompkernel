import fs from 'node:fs';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
import { chironParseTape, CHIRON_SEP } from '@/lib/omega/chiron';
import * as CH from '@/lib/omega/chiron';
const enc='o200k_base' as any;
const f=process.env.F||'';
const text=fs.readFileSync(f,'utf8');
const r:any=oikonomiaEncode(text,enc);
const w:string=r.wire; const cut=w.indexOf(CHIRON_SEP,1);
const tape0=w.slice(1,cut), body=w.slice(cut+1);
const cp0=tape0.codePointAt(0)!;
let script:any=null;
for(const s of (CH as any).CHIRON_SCRIPTS){ if((CH as any).chironInScript(s,cp0)){ script=s; break; } }
const rules=chironParseTape(tape0,script)!;
console.log('== '+f.split('/').pop()+'  msg '+r.messageTokens+'  rules '+rules.length+'  script '+script.name+' ==');
let tot=0;
const rows=rules.map((x,i)=>({i,g:x.glyph,raw:x.raw,tok:countTokens(x.glyph+x.raw,enc)}));
rows.sort((a,b)=>b.tok-a.tok);
for(const x of rows.slice(0,18)){ tot+=x.tok;
  console.log(`  tok=${String(x.tok).padStart(3)} g=${JSON.stringify(x.g)} raw=${JSON.stringify(x.raw.slice(0,70))}`); }
console.log('  ... total glossary tokens:',rules.reduce((a,x)=>a+countTokens(x.glyph+x.raw,enc),0));
console.log('  sum of top18:',tot);
console.log('== TAPE first 300 chars ==');
console.log(JSON.stringify(body.slice(0,300)));
