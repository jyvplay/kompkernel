/**
 * X132 — CORRECTED anatomy. Two bugs in the X131 version:
 *  (a) the glyph alphabet was hard-coded to 0x0386..0x04ff, but dpkg-l names its
 *      rules with ARABIC characters, so every one of its body glyphs (211 of
 *      them) was counted as "other" and the lane reported "glyph 0";
 *  (b) a glyph was only counted when the whole token was a single glyph
 *      character, so any token that merged a glyph with a neighbour was missed.
 * Here the alphabet is derived per lane (chars in the message absent from the
 * source) and a token counts as a glyph if it CONTAINS one.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { encode, decode } from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const inPool=(cp:number)=>
  (cp>=0x0400&&cp<=0x04FF)||(cp>=0x0370&&cp<=0x03FF)||(cp>=0x0600&&cp<=0x06FF)||
  (cp>=0x0590&&cp<=0x05FF)||[0x2020,0x2021,0x2022,0x00B7,0x00B1,0x00D7,0x00F7,
    0x2260,0x221E,0x2248,0x2264,0x2265].includes(cp);
function glyphSet(src:string,msg:string){
  const s=new Set<string>(); for(let i=0;i<src.length;i++) s.add(src[i]!);
  const g=new Set<string>();
  for(let i=0;i<msg.length;i++){const c=msg[i]!; if(!s.has(c)&&inPool(c.codePointAt(0)!)) g.add(c);}
  return g;
}
const lanes=fs.readFileSync('bench/x109/lanes29.txt','utf8').split('\n').filter(Boolean);
fs.mkdirSync('bench/x132/receipts',{recursive:true});
const f=fs.openSync('bench/x132/receipts/x132-anatomy.jsonl','w');
let SP=0,ST=0,SB=0,STOT=0,SRAW=0,bad=0;
const tg={glyph:0,num:0,word:0,other:0};
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8');
  const raw=countTokens(text,enc);
  const a:any=tagstackEncode(text,enc);
  const M=a.message as string;
  const G=glyphSet(text,M);
  const i1=M.indexOf('\u00a7'); const i2=i1<0?-1:M.indexOf('\u00b6',i1);
  const pre=i1<0?M:M.slice(0,i1);
  const tape=i1<0?'':(i2<0?M.slice(i1):M.slice(i1,i2));
  const body=i2<0?'':M.slice(i2);
  const tPre=countTokens(pre,enc),tTape=countTokens(tape,enc),tBody=countTokens(body,enc);
  SP+=tPre;ST+=tTape;SB+=tBody;STOT+=a.messageTokens;SRAW+=raw;
  if(a.decoded!==text)bad++;
  let g=0,num=0,word=0,other=0;
  for(const t of encode(body).map(i=>decode([i]))){
    let hasG=false; for(const c of t) if(G.has(c)){hasG=true;break;}
    if(hasG) g++;
    else if(/^[\s]*[0-9][0-9.,:%\/]*$/.test(t)) num++;
    else if(/[A-Za-z\u00c0-\u024f]/.test(t)) word++;
    else other++;
  }
  tg.glyph+=g; tg.num+=num; tg.word+=word; tg.other+=other;
  fs.writeSync(f,JSON.stringify({path:p,raw,out:a.messageTokens,pre:tPre,tape:tTape,body:tBody,
    glyphs:G.size,bodyGlyph:g,bodyNum:num,bodyWord:word,bodyOther:other,exact:a.decoded===text,noTape:i1<0})+'\n');
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(raw).padStart(5)} out ${String(a.messageTokens).padStart(5)}  pre ${String(tPre).padStart(4)} tape ${String(tTape).padStart(5)} body ${String(tBody).padStart(5)} | glyphs ${String(G.size).padStart(3)} body: glyph ${String(g).padStart(4)} num ${String(num).padStart(4)} word ${String(word).padStart(4)} other ${String(other).padStart(4)}  ${a.decoded===text?'EXACT':'***MISMATCH***'}`);
}
fs.closeSync(f);
console.log(`\nSIGMA raw=${SRAW} out=${STOT}  preamble=${SP} tape=${ST} body=${SB}  mismatch=${bad}`);
const t=tg.glyph+tg.num+tg.word+tg.other;
console.log(`BODY CLASSES (corrected): total ${t}  glyph ${tg.glyph} (${(100*tg.glyph/t).toFixed(0)}%)  word ${tg.word} (${(100*tg.word/t).toFixed(0)}%)  other ${tg.other} (${(100*tg.other/t).toFixed(0)}%)  num ${tg.num} (${(100*tg.num/t).toFixed(0)}%)`);
