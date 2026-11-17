/**
 * X131 — ΕΓΚΙΒΩΤΙΣΜΌΣ end-to-end A/B on the 29 canonical lanes.
 *   A = tagstackEncode(src).message            (the shipped frontier)
 *   B = enkibotismosEncode(src).message        (frontier + tape encapsulation)
 * One frontier encode per lane: `base` supplies both A's token count and the
 * input tape, so column A is not a second run.
 * Exactness: the rewritten tape must denote the same glyph -> value pairs for
 * every glyph the body references, the body itself is byte-identical, and the
 * frontier guarantees decoded === src.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { enkibotismosEncode } from '../../src/lib/omega/enkibotismos';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=fs.readFileSync('bench/x109/lanes29.txt','utf8').split('\n').filter(Boolean);
fs.mkdirSync('bench/x131/receipts',{recursive:true});
const f=fs.openSync('bench/x131/receipts/x131-enkibotismos.jsonl','w');
let A=0,B=0,better=0,worse=0,exact=0,orph=0,refs=0;
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8'); const raw=countTokens(text,enc);
  let bTok=0, note='no-pay', ok=false, o=0, rf=0, rb=0, ra=0, su=0;
  const a:any=tagstackEncode(text,enc);
  try{
    const r=enkibotismosEncode(text,enc);
    if(r){ bTok=r.tokens; o=r.orphansDropped; rf=r.refsAdded; rb=r.rulesBefore; ra=r.rulesAfter; su=r.prunedSingleUse;
           ok = r.toFrontier(r.message)===a.message && a.decoded===text;
           note=`rules ${rb}->${ra} orph-${o} once-${su} refs+${rf}`; }
    else { bTok=a.messageTokens; note='no-pay'; ok=a.decoded===text; }
  }catch(e:any){ bTok=a.messageTokens; note='THREW '+String(e.message).slice(0,26); }
  A+=a.messageTokens; B+=bTok; orph+=o; refs+=rf;
  if(bTok<a.messageTokens)better++; if(bTok>a.messageTokens)worse++;
  if(ok)exact++;
  fs.writeSync(f,JSON.stringify({path:p,raw,a:a.messageTokens,b:bTok,d:bTok-a.messageTokens,orphans:o,refs:rf,rulesBefore:rb,rulesAfter:ra,exact:ok,note})+'\n');
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(raw).padStart(5)}  A ${String(a.messageTokens).padStart(5)}  B ${String(bTok).padStart(5)}  Δ ${String(bTok-a.messageTokens).padStart(4)}  ${note.padEnd(34)} exact ${ok?'y':'N'}`);
}
fs.closeSync(f);
console.log(`\nENKIBOTISMOS 29   A ${A}   B ${B}   ΣΔ ${B-A}   better ${better} worse ${worse}   exact ${exact}/29   orphans ${orph} refs ${refs}`);
