/**
 * X132: derive each lane's glyph alphabet EMPIRICALLY. merismos.ts:84 says id
 * chars are chosen "only ones ABSENT from the wire". So: glyph == a character
 * present in the message but absent from the source. That is alphabet-agnostic
 * and covers the Cyrillic/Greek pool AND the Arabic pool dpkg-l was found using.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const block=(cp:number)=>{
  if(cp>=0x0400&&cp<=0x04FF)return'Cyrillic';
  if(cp>=0x0370&&cp<=0x03FF)return'Greek';
  if(cp>=0x0600&&cp<=0x06FF)return'Arabic';
  if(cp>=0x0590&&cp<=0x05FF)return'Hebrew';
  if(cp>=0x00A0&&cp<=0x00FF)return'Latin1';
  if(cp>=0x2000&&cp<=0x20FF)return'Punct';
  if(cp>=0x0900&&cp<=0x097F)return'Devanagari';
  if(cp>=0x0400)return'hi-'+cp.toString(16);
  return'U+'+cp.toString(16);
};
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const text=fs.readFileSync(p,'utf8');
  const a:any=tagstackEncode(text,enc); const M=a.message as string;
  const src=new Set<string>();
  for(let i=0;i<text.length;i++){ const ch=text[i]!; src.add(ch); }
  const glyph=new Set<string>();
  for(let i=0;i<M.length;i++){ const ch=M[i]!; if(!src.has(ch)) glyph.add(ch); }
  const blocks=new Map<string,number>();
  for(const g of glyph){ const b=block(g.codePointAt(0)!); blocks.set(b,(blocks.get(b)??0)+1); }
  const bs=[...blocks.entries()].sort((x,y)=>y[1]-x[1]).map(([k,v])=>`${k}:${v}`).join(' ');
  // where do they appear?
  const i1=M.indexOf('\u00a7'); const i2=M.indexOf('\u00b6',i1);
  const pre=i1<0?M:M.slice(0,i1);
  const tape=i1<0?'':(i2<0?M.slice(i1):M.slice(i1,i2));
  const body=i2<0?'':M.slice(i2);
  const cnt=(s:string)=>{let n=0;for(let i=0;i<s.length;i++) if(glyph.has(s[i]!))n++;return n;};
  console.log(`${p.split('/').pop()!.padEnd(20)} out=${String(a.messageTokens).padStart(4)} glyphChars=${String(glyph.size).padStart(3)}  inPre=${String(cnt(pre)).padStart(3)} inTape=${String(cnt(tape)).padStart(3)} inBody=${String(cnt(body)).padStart(3)}  blocks: ${bs}`);
}
