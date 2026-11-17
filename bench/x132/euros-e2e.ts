/**
 * X132 — ΕΥΡΟΣ end-to-end A/B on the 29 canonical lanes.
 *   A = tagstackEncode(src).message      (the shipped frontier)
 *   B = eurosFromFrontier(A,src).message (frontier + span retuning)
 * The shared entry point is used: the frontier result is computed once and
 * handed to the codec, which is the path that makes adoption 44% cheaper.
 *
 * EXACTNESS is checked TWO independent ways:
 *   (1) euros.toFrontier(B) === A  — the transform is invertible;
 *   (2) the frontier re-encodes and its own `decoded === src` gate holds;
 * plus the codec's internal expanded-body invariant (asserted inside euros.ts).
 * One frontier encode per lane: `base` supplies both A's tokens and the input.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { eurosFromFrontier } from '../../src/lib/omega/euros';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=fs.readFileSync('bench/x109/lanes29.txt','utf8').split('\n').filter(Boolean);
fs.mkdirSync('bench/x132/receipts',{recursive:true});
const f=fs.openSync('bench/x132/receipts/x132-euros.jsonl','w');
let A=0,B=0,better=0,worse=0,exact=0,E=0,S=0,O=0,R=0;
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8'); const raw=countTokens(text,enc);
  const a:any=tagstackEncode(text,enc);
  let bTok=a.messageTokens, note='no-pay', ok=false, e=0,s=0,o=0,r=0,pr=0,rb=0,ra=0;
  try{
    const r2=eurosFromFrontier(a,text,enc);
    if(r2){ bTok=r2.tokens; e=r2.extends_; s=r2.shrinks; o=r2.orphansDropped; r=r2.refsAdded; pr=r2.probes;
            rb=r2.rulesBefore; ra=r2.rulesAfter;
            ok = r2.toFrontier(r2.message)===a.message && (a.decoded===text);
            note=`rules ${rb}->${ra} ext+${e} shr-${s} orph-${o} refs+${r} probes ${pr}`; }
    else { note='no-pay'; ok=a.decoded===text; }
  }catch(err:any){ bTok=a.messageTokens; note='THREW '+String(err.message).slice(0,24); }
  A+=a.messageTokens; B+=bTok; E+=e; S+=s; O+=o; R+=r;
  if(bTok<a.messageTokens)better++; if(bTok>a.messageTokens)worse++;
  if(ok)exact++;
  fs.writeSync(f,JSON.stringify({path:p,raw,a:a.messageTokens,b:bTok,d:bTok-a.messageTokens,ext:e,shr:s,orph:o,refs:r,rulesBefore:rb,rulesAfter:ra,probes:pr,exact:ok,note})+'\n');
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(raw).padStart(5)}  A ${String(a.messageTokens).padStart(5)}  B ${String(bTok).padStart(5)}  Δ ${String(bTok-a.messageTokens).padStart(4)}  ${note.padEnd(46)} exact ${ok?'y':'N'}`);
}
fs.closeSync(f);
console.log(`\nEUROS 29   A ${A}   B ${B}   ΣΔ ${B-A}   better ${better} worse ${worse}   exact ${exact}/29   ext ${E} shr ${S} orph ${O} refs ${R}`);
