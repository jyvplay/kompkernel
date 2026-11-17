/**
 * X129 — ΠΥΚΝΩΤΗΣ composition A/B on the 29 canonical lanes.
 * A = tagstackFrontier(source)                        (shipped frontier)
 * B = tagstackFrontier(sygkollesis(source).message)      (sygkollesis pre-stage)
 * The reader for B is: stack-decode, then expand each glyph (char-level, no parsing).
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
import { sygkollesisEncode, sygkollesisResetProbes } from '../../src/lib/omega/sygkollesis';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=fs.readFileSync('bench/x109/lanes29.txt','utf8').split('\n').filter(Boolean);
fs.mkdirSync('bench/x126/receipts',{recursive:true});
const out='bench/x126/receipts/x129-sygkollesis-compose.jsonl';
const f=fs.openSync(out,'w');
let A=0,B=0,better=0,worse=0,exA=0,exB=0,msA=0,msB=0;
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8');
  const raw=countTokens(text,enc);
  const t1=Date.now(); const a:any=tagstackFrontier(text,enc); const dA=Date.now()-t1;
  let bTok=raw, dB=0, note='syg:off', exactB=(a.decoded===text), pykTok=0;
  try{
    const pyk=sygkollesisEncode(text,enc);
    if(pyk){
      pykTok=pyk.tokens;
      const t2=Date.now(); const b:any=tagstackFrontier(pyk.message,enc); dB=Date.now()-t2;
      bTok=b.messageTokens; exactB=(b.decoded===pyk.message);
      note=`syg:K=${pyk.k},m=${pyk.mergeScore}`;
    } else note='syg:nopay';
  }catch(e:any){ note='syg:THREW '+String(e.message).slice(0,30); }
  const delta=bTok-a.messageTokens;
  A+=a.messageTokens; B+=bTok; msA+=dA; msB+=dB;
  if(delta<0)better++; if(delta>0)worse++;
  if(a.decoded===text)exA++; if(exactB)exB++;
  const row={path:p,raw,a:a.messageTokens,b:bTok,delta,pykRaw:pykTok,exactA:a.decoded===text,exactB,note,msA:dA,msB:dB};
  fs.writeSync(f,JSON.stringify(row)+'\n');
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(raw).padStart(5)}  A ${String(a.messageTokens).padStart(5)}  B ${String(bTok).padStart(5)}  Δ ${String(delta).padStart(5)}  ${note.padEnd(18)} exact ${row.exactA?'y':'N'}/${exactB?'y':'N'}  ${dA}/${dB}ms`);
  sygkollesisResetProbes();
}
fs.closeSync(f);
console.log(`\nCOMPOSE 29   A(stack) ${A}   B(sygkollesis+stack) ${B}   ΣΔ ${B-A}   better ${better} worse ${worse}`);
console.log(`exact  A ${exA}/29   B ${exB}/29     wall A ${msA}ms  B ${msB}ms`);
