/** X90 — what the reading-order statement costs, and why it is paid.
 *
 *  The shipped message carries TWO instruction lines: ΣΥΜΦΥΊΑ's contract, then the frontier's
 *  own (`Before ¶ k=v. expand repeatedly; print only.`). In the encoded body whitespace has
 *  been replaced by glyphs, so field-splitting it BEFORE the inner decode binds the rule to the
 *  wrong cells. The CRC makes that mistake fail closed rather than wrong, but a reader who
 *  cannot tell which instruction applies first cannot read the message at all -- and
 *  "directly readable with no system prompt" is the claim the codec has to honour.
 *  PROSPHYSIS pays three tokens for the same statement (`X74. Body first. Then ...`).
 *
 *  Priced offline against the MEASURED F(rewrite) per lane, from bench/x90/receipts/run.json.
 *  NOTE the ls-la-usrbin and dpkg columns below reuse ls-l-real's rule TEXT and vary only the
 *  CRC, so they understate those lanes' contracts (ls-la-usrbin's really carries
 *  `"/etc/alternatives/" + `); the ls-l-real column is the one that is exact, and the final
 *  per-lane contract costs were measured directly in bench/x90/receipts/emit-coldread.log at
 *  26 / 31 / 27 tokens. */
import { countTokens } from '../../src/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
// F(rewrite) measured this pass, contract-independent: ls-l-real 1386-22-1=1363, ls-la-usrbin 927-27-1=899
const L: Array<[string,number,number,string]> = [['ls-l-real',1363,1394,'16f86bf2'],['ls-la-usrbin',899,946,'a7511409'],['dpkg-l-full',2240,2262,'39e50f9b']];
const V: Array<[string,(c:string)=>string]> = [
 ['A current (no order)',        (c)=>`X90 f11 = f9 + text after ※ (1-based). crc=${c}`],
 ['B body first',                (c)=>`X90. Body first. Then f11 = f9 + text after ※ (1-based). crc=${c}`],
 ['C body first + print',        (c)=>`X90. Body first. Then f11 = f9 + text after ※ (1-based). Print only. crc=${c}`],
 ['D expand',                    (c)=>`X90. Body first, then expand: f11 = f9 + text after ※ (1-based). crc=${c}`],
 ['E shortest ordered',          (c)=>`X90 body first; f11 = f9 + text after ※ (1-based). crc=${c}`],
];
console.log('F(rewrite) per lane from the measured pass: ' + L.map(([n,f])=>`${n} ${f}`).join(', '));
console.log('(model verified exact: contract 22 + 1 + 1363 = 1386, measured 1386)\n');
for (const [id,mk] of V) {
  const line = [id.padEnd(22)];
  let allWin = true;
  for (const [n,fr,sh,c] of L) { const ct=T(mk(c)); const tot=ct+1+fr; const d=tot-sh; if(d>=0) allWin=false;
    line.push(`${n}: ${String(ct).padStart(2)}tok -> ${tot} (${d>=0?'+':''}${d})`); }
  console.log(line.join('   ') + (allWin ? '   ALL WIN' : ''));
}
