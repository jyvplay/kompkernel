/**
 * X131: is the TAPE factorable? i.e. is some rule's VALUE a substring of
 * another rule's VALUE? If so, the longer entry can reference the shorter one
 * (the tape format ALREADY supports back-references), saving len(short)-1
 * tokens, with the BODY completely untouched.
 * NOTE: this is a different question from "are there repeated n-grams in the
 * tape" (measured: 0). Factorability is about CONTAINMENT between rules.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
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
  // parse: first occurrence of a glyph starts its rule
  const rules:Array<{g:string;v:string}>=[];
  const seen=new Set<string>(); let cur:{g:string;v:string}|null=null;
  for(const ch of tape){
    if(isG(ch)&&!seen.has(ch)){ seen.add(ch); cur={g:ch,v:''}; rules.push(cur); }
    else if(cur) cur.v+=ch;
  }
  // how many chars of the tape are already back-references?
  let refChars=0, litChars=0;
  for(const r of rules) for(const c of r.v){ if(isG(c)) refChars++; else litChars++; }
  // factorability: containment between rule values
  let savings=0; const ex:Array<[string,string,number]>=[];
  for(const B of rules){
    if(B.v.length<3) continue;
    let bestA:string|null=null, bestLen=0;
    for(const A of rules){
      if(A===B||A.v.length<3) continue;
      if(B.v.includes(A.v)&&A.v.length>bestLen){ bestLen=A.v.length; bestA=A.v; }
    }
    if(bestA){
      const gain=countTokens(bestA,enc)-1;   // replaced by 1 glyph reference
      if(gain>0){ savings+=gain; if(ex.length<3) ex.push([bestA,B.v.slice(0,28),gain]); }
    }
  }
  console.log(`${p.split('/').pop()!.padEnd(20)} tape=${String(countTokens(tape,enc)).padStart(4)} rules=${String(rules.length).padStart(3)} refChars=${String(refChars).padStart(4)} litChars=${String(litChars).padStart(4)}  FACTOR SAVING=${String(savings).padStart(4)}  ${ex.map(([a,b,g])=>`${JSON.stringify(a.slice(0,14))}⊂${JSON.stringify(b.slice(0,14))}(+${g})`).join(' ')}`);
}
