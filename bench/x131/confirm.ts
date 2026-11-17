/**
 * X131 — re-confirm the frontier and recompute the anatomy with the CORRECT
 * entry point (tagstackEncode), pinned with OMEGA_DET=1.
 * Also breaks the body down by token CLASS so we can see where the mass is.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { encode, decode } from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=fs.readFileSync('bench/x109/lanes29.txt','utf8').split('\n').filter(Boolean);
const f=fs.openSync('bench/x131/receipts/x131-confirm.jsonl','w');
const GLYPH_LO=0x0386, GLYPH_HI=0x04ff;
const isG=(c:string)=>{const x=c.codePointAt(0)!;return x>=GLYPH_LO&&x<=GLYPH_HI;};
let SP=0,ST=0,SB=0,STOT=0,SRAW=0,bad=0;
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8');
  const raw=countTokens(text,enc);
  const a:any=tagstackEncode(text,enc);
  const M=a.message as string;
  const i1=M.indexOf('\u00a7');
  const i2=i1<0?-1:M.indexOf('\u00b6',i1);
  const pre=i1<0?M:M.slice(0,i1);
  const tape=i1<0?'':(i2<0?M.slice(i1):M.slice(i1,i2));
  const body=i2<0?'':M.slice(i2);
  const tPre=countTokens(pre,enc),tTape=countTokens(tape,enc),tBody=countTokens(body,enc);
  SP+=tPre;ST+=tTape;SB+=tBody;STOT+=a.messageTokens;SRAW+=raw;
  if(a.decoded!==text)bad++;
  // body token classes
  const toks=encode(body).map(i=>decode([i]));
  let g=0,num=0,word=0,other=0;
  for(const t of toks){
    if(t.length===1&&isG(t)) g++;
    else if(/^[\s]*[0-9][0-9.,:%\/]*$/.test(t)) num++;
    else if(/[A-Za-z\u00c0-\u024f]/.test(t)) word++;
    else other++;
  }
  fs.writeSync(f,JSON.stringify({path:p,raw,out:a.messageTokens,pre:tPre,tape:tTape,body:tBody,
    bodyGlyph:g,bodyNum:num,bodyWord:word,bodyOther:other,exact:a.decoded===text,noTape:i1<0})+'\n');
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(raw).padStart(5)} out ${String(a.messageTokens).padStart(5)}  pre ${String(tPre).padStart(4)} tape ${String(tTape).padStart(5)} body ${String(tBody).padStart(5)} | body: glyph ${String(g).padStart(4)} num ${String(num).padStart(4)} word ${String(word).padStart(4)} other ${String(other).padStart(4)}  ${a.decoded===text?'EXACT':'***MISMATCH***'}`);
}
fs.closeSync(f);
console.log(`\nSIGMA raw=${SRAW} out=${STOT}  preamble=${SP} tape=${ST} body=${SB}  mismatch=${bad}`);
