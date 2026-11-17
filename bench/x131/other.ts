/** X131: what IS the 'other' 32% of the body? dump its most frequent tokens. */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { encode, decode } from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const GLYPH_LO=0x0386, GLYPH_HI=0x04ff;
const isG=(c:string)=>{const x=c.codePointAt(0)!;return x>=GLYPH_LO&&x<=GLYPH_HI;};
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const text=fs.readFileSync(p,'utf8');
  const a:any=tagstackEncode(text,enc);
  const M=a.message as string; const i1=M.indexOf('\u00a7'); const i2=M.indexOf('\u00b6',i1);
  const body=i2<0?'':M.slice(i2);
  const toks=encode(body).map(i=>decode([i]));
  const other=new Map<string,number>(); let oTot=0;
  for(const t of toks){
    if(t.length===1&&isG(t)) continue;
    if(/^[\s]*[0-9][0-9.,:%\/]*$/.test(t)) continue;
    if(/[A-Za-z\u00c0-\u024f]/.test(t)) continue;
    other.set(t,(other.get(t)??0)+1); oTot++;
  }
  const top=[...other].sort((x,y)=>y[1]-x[1]);
  console.log(`\n${p.split('/').pop()}  otherTokens=${oTot}  distinct=${top.length}`);
  console.log(`  top18: ${top.slice(0,18).map(([w,c])=>`${JSON.stringify(w)}x${c}`).join(' ')}`);
}
