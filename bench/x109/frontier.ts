/**
 * X109 — 29-LANE FRONTIER A/B FOR ΣΥΜΜΕΤΡΟΝ, at the chain (tagstackFrontier) layer.
 *
 * Arm OFF = OMEGA_NO_SYMMETRON=1: the merged X108 behaviour (character proxy, no
 * opposite-proxy variants).  Arm ON = the shipped X109 form.  Both arms run in
 * this one process under the same pinned flags, and every lane's exactness is
 * re-checked with the repository's own decoder rather than trusting the encoder's
 * self-report.  Results are appended to a JSONL receipt as each lane finishes, so
 * a terminated run is readable and is reported as terminated.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
import { chironDecode } from '../../src/lib/omega/chiron';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=fs.readFileSync(process.argv[2]!,'utf8').split('\n').filter(Boolean);
const out=process.argv[3]!;
fs.mkdirSync('bench/x109/receipts',{recursive:true});
const f=fs.openSync(out,'w');
const rows:any[]=[];
let off=0,on=0,exOff=0,exOn=0,decOk=0;
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8');
  const raw=countTokens(text,enc);
  process.env.OMEGA_NO_SYMMETRON='1';
  const t1=Date.now(); const a:any=tagstackFrontier(text,enc); const msOff=Date.now()-t1;
  delete process.env.OMEGA_NO_SYMMETRON;
  const t2=Date.now(); const b:any=tagstackFrontier(text,enc); const msOn=Date.now()-t2;
  // independent decode check on the ON arm's message
  let dec=false;
  try{ const w=(b.message as string).indexOf('\u00a7'); dec = w<0 ? (b.message===text) : (chironDecode((b.message as string).slice(w))===text); }catch{}
  off+=a.messageTokens; on+=b.messageTokens;
  if(a.decoded===text)exOff++; if(b.decoded===text)exOn++; if(dec)decOk++;
  const row={path:p,raw,off:a.messageTokens,on:b.messageTokens,delta:b.messageTokens-a.messageTokens,
    exactOff:a.decoded===text,exactOn:b.decoded===text,decodeOk:dec,parentOn:b.parentCodec,msOff,msOn};
  rows.push(row);
  fs.writeSync(f,JSON.stringify(row)+'\n');
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(raw).padStart(5)}  OFF ${String(a.messageTokens).padStart(5)}  ON ${String(b.messageTokens).padStart(5)}  Δ ${String(row.delta).padStart(4)}  exact ${a.decoded===text?'y':'N'}/${b.decoded===text?'y':'N'}  decode ${dec?'y':'N'}  ${msOff}/${msOn}ms`);
}
fs.closeSync(f);
fs.writeFileSync(out.replace('.jsonl','.json'),JSON.stringify({det:'1',lanes:lanes.length,rows,
  offTotal:off,onTotal:on,delta:on-off,exactOff:exOff,exactOn:exOn,decodeOk:decOk,
  lanesWorse:rows.filter(r=>r.delta>0).length,lanesBetter:rows.filter(r=>r.delta<0).length},null,1)+'\n');
console.log(`\nFRONTIER 29  OFF ${off}  ON ${on}  ΣΔ ${on-off}   better ${rows.filter(r=>r.delta<0).length} worse ${rows.filter(r=>r.delta>0).length}`);
console.log(`exact OFF ${exOff}/29  ON ${exOn}/29   independent decode OK ${decOk}/29`);
