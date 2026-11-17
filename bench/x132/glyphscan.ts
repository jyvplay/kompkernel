/** X132: what glyph characters does the tape ACTUALLY use, and does the body reference them? */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
// the true alphabet from merismos.ts:84
const POOL='абвгдежзийклмнопрстуфхцчшщъыьэюяАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'
 +'αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ'+'§¶†‡•·±×÷≠∞≈≤≥';
const ISG=new Set(POOL.split(''));
const NARROW=(c:string)=>{const x=c.codePointAt(0)!;return x>=0x0386&&x<=0x04ff;};
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const text=fs.readFileSync(p,'utf8');
  const a:any=tagstackEncode(text,enc); const M=a.message as string;
  const i1=M.indexOf('\u00a7'); const i2=M.indexOf('\u00b6',i1);
  const pre=i1<0?M:M.slice(0,i1);
  const tape=i1<0?'':(i2<0?M.slice(i1):M.slice(i1,i2));
  const body=i2<0?'':M.slice(i2);
  // chars in tape that are in POOL (candidate glyph names)
  const tapeG=new Set<string>(); for(const c of tape) if(ISG.has(c)) tapeG.add(c);
  const bodyG=new Set<string>(); for(const c of body) if(ISG.has(c)) bodyG.add(c);
  const narrowBody=new Set<string>(); for(const c of body) if(NARROW(c)) narrowBody.add(c);
  const sample=[...tapeG].slice(0,14).map(c=>c).join('');
  console.log(`${p.split('/').pop()!.padEnd(18)} tapeTok=${String(countTokens(tape,enc)).padStart(4)} bodyTok=${String(countTokens(body,enc)).padStart(4)} tapeGlyphs(POOL)=${String(tapeG.size).padStart(3)} bodyGlyphs(POOL)=${String(bodyG.size).padStart(3)} bodyGlyphs(NARROW)=${String(narrowBody.size).padStart(3)}  poolSample="${sample}"`);
}
