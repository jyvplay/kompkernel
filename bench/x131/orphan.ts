/** X131: are there tape rules the BODY never references? Pure waste if so. */
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
  const a:any=tagstackEncode(text,enc); const M=a.message as string;
  const i1=M.indexOf('\u00a7'); if(i1<0){console.log(`${p.split('/').pop()!.padEnd(20)} NO TAPE`);continue;}
  const i2=M.indexOf('\u00b6',i1); const tape=i2<0?M.slice(i1):M.slice(i1,i2); const body=i2<0?'':M.slice(i2);
  const rules:{g:string;v:string}[]=[]; const seen=new Set<string>(); let cur:any=null;
  for(const ch of tape){ if(isG(ch)&&!seen.has(ch)){seen.add(ch);cur={g:ch,v:''};rules.push(cur);} else if(cur) cur.v+=ch; }
  const bodyG=new Set<string>(); for(const c of body) if(isG(c)) bodyG.add(c);
  let orphanTok=0, orphanN=0;
  for(const r of rules) if(!bodyG.has(r.g)){ orphanN++; orphanTok+=countTokens(r.g+r.v,enc); }
  console.log(`${p.split('/').pop()!.padEnd(20)} tape=${String(countTokens(tape,enc)).padStart(4)} rules=${String(rules.length).padStart(3)} bodyGlyphs=${String(bodyG.size).padStart(3)} ORPHANS=${String(orphanN).padStart(3)} (${String(orphanTok).padStart(4)} tok)`);
}
