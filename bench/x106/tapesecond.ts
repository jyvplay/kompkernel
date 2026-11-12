/** X106 — is there SECOND-LEVEL headroom in the tape? ΧΕΙΡΩΝ's macro loop
 *  re-enumerates over [body, ...literal rule texts], so it already compresses
 *  rule values — but only for spans that survive the profit test AND the
 *  positional window at the moment they are considered. This measures the gap:
 *  how many tokens the tape costs as emitted, versus how many a second ΧΕΙΡΩΝ
 *  pass over the tape string alone would cost. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { chironEncode, chironDecode } from '../../src/lib/omega/chiron';
process.env.OMEGA_DET='1';
const enc:any='o200k_base';
const WANT=['vmstat','psql-output','email-thread','du-real','findmnt','prices','df-real','ps-real','kubectl','node-help','code-ts','dpkg-l','apt-real','ps-aux-real','ls-l-real'];
const ALL=fs.readFileSync('/tmp/lanes.txt','utf8').split('\n').filter(Boolean);
let sTape=0,sSecond=0;
for(const p of ALL.filter(x=>WANT.some(w=>x.includes(w)))){
  const text=fs.readFileSync(p,'utf8');
  const r:any=chironEncode(text,enc);
  const w=r.wire.indexOf('\u00a7'),tEnd=r.wire.indexOf('\u00b6',w);
  const tape=r.wire.slice(w+1,tEnd);
  const tTape=countTokens(tape,enc);
  // second level: ΧΕΙΡΩΝ on the tape string alone (identity if it does not help)
  let second=-1, ok=false;
  if(tape.length>=16){
    const r2:any=chironEncode(tape,enc);
    second=r2.messageTokens; ok=chironDecode(r2.wire)===tape;
  }
  sTape+=tTape; if(second>0)sSecond+=second;
  console.log(`${p.split('/').pop()!.padEnd(22)} tapeChars ${String(tape.length).padStart(5)}  tapeToks ${String(tTape).padStart(5)}  secondLevel ${String(second).padStart(5)} (${ok?'exact':'INEXACT'})  gain ${second>0?tTape-second:0}`);
}
console.log(`\nTOTAL tape tokens ${sTape}  second-level ${sSecond}  gain ${sTape-sSecond}`);
