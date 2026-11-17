/**
 * X131: does the TAPE itself still contain uncaptured repeats?
 * The tape is a separate object from the body: compressing it cannot damage any
 * structure the X-chain exploits, because the body is untouched.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
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
  const M=a.message as string;
  const i1=M.indexOf('\u00a7'); if(i1<0){console.log(`${p.split('/').pop()!.padEnd(20)} NO TAPE`);continue;}
  const i2=M.indexOf('\u00b6',i1);
  const tape=i2<0?M.slice(i1):M.slice(i1,i2);
  // parse glyph set; strip glyph chars -> the tape's LITERAL payload
  const defined=new Set<string>();
  for(const ch of tape) if(isG(ch)) defined.add(ch);
  let lit=''; for(const ch of tape) if(!defined.has(ch)) lit+=ch;
  const toks=encode(tape).map(i=>decode([i]));
  let total=0; const best:any[]=[];
  for(let n=2;n<=10;n++){
    const seen=new Map<string,number>();
    for(let i=0;i+n<=toks.length;i++){const k=toks.slice(i,i+n).join('\u0001');seen.set(k,(seen.get(k)??0)+1);}
    for(const [k,c] of seen){ if(c<2)continue; const t=n,gain=c*(t-1)-(1+t); if(gain>0){total+=gain;best.push({s:k.split('\u0001').join(''),c,n,gain});} }
  }
  best.sort((x,y)=>y.gain-x.gain);
  console.log(`${p.split('/').pop()!.padEnd(20)} tape=${String(countTokens(tape,enc)).padStart(4)} rules=${String(defined.size).padStart(3)}  REPEAT POTENTIAL=${String(total).padStart(4)}  top=${best.slice(0,4).map(b=>`${JSON.stringify(b.s.slice(0,16))}x${b.c}(+${b.gain})`).join(' ')}`);
}
