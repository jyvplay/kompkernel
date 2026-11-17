/**
 * X133 — is the shipped message still a plain substitution puzzle?
 *
 * The reader contract is: one `§`-delimited, delimiter-free dictionary in
 * topological order, then a body, "expand repeatedly". ΣΥΝΑΡΜΟΓΗ must not have
 * changed that. This re-parses each shipped message from scratch, expands it
 * with nothing but the format's own rule, and compares to the source.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
let ok=0,abs=0,rel=0,bad=0;
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const src=fs.readFileSync(p,'utf8');
  const a:any=tagstackEncode(src,enc);
  const M=a.message as string;
  // 1. split pre / tape / body using ONLY the format's markers
  const i1=M.indexOf('§'); const i2=M.indexOf('¶',i1);
  if(i1<0||i2<0){ console.log(`${p.split('/').pop()!.padEnd(20)} no tape — arms other than the dictionary`); continue; }
  const tape=M.slice(i1,i2), body=M.slice(i2+1);
  // 2. a glyph is any character in the message that the source does not contain
  const srcCh=new Set([...src]);
  const isG=(c:string)=>!srcCh.has(c) && c!=='§' && c!=='¶';
  // 3. parse: the FIRST occurrence of each glyph begins its rule (topological order)
  const order:string[]=[]; const val=new Map<string,string>(); let cur:string|null=null;
  for(const ch of tape){ if(isG(ch)&&!val.has(ch)){ val.set(ch,''); order.push(ch); cur=ch; } else if(cur) val.set(cur,val.get(cur)!+ch); }
  // 4. verify topological order: a value may only reference EARLIER glyphs
  let topo=true; const seen=new Set<string>();
  for(const g of order){ for(const ch of val.get(g)!) if(isG(ch)&&!seen.has(ch)) topo=false; seen.add(g); }
  // 5. expand repeatedly
  const exp=new Map<string,string>();
  for(const g of order){ let o=''; for(const ch of val.get(g)!) o+=exp.has(ch)?exp.get(ch)!:ch; exp.set(g,o); }
  let out=''; for(const ch of body) out+=exp.has(ch)?exp.get(ch)!:ch;
  const same = out===src;
  if(same)abs++; else rel++;
  if(topo) ok++; else bad++;
  console.log(`${p.split('/').pop()!.padEnd(20)} rules=${String(order.length).padStart(3)} topological=${topo?'y':'N'}  expand==source? ${same?'YES':'no (generative body)'}`);
}
console.log(`\nexpands to the SOURCE verbatim: ${abs}   generative-body lanes: ${rel}   topological order violated: ${bad}`);
