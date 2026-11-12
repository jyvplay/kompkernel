/** X106 — does the 400 000-entry enumeration cap bite? enumerateTokenSpans
 *  returns EARLY when counts.size reaches CHIRON_MAX_TOKEN_SPAN_ENTRIES, so on a
 *  lane that fills the map the surviving entries are decided by Map insertion
 *  order, i.e. by leftmost occurrence in the text — a span that occurs late in
 *  the text and has a huge profit is never even a candidate. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { enumerateTokenSpans, CHIRON_MAX_TOKEN_SPAN_ENTRIES } from '../../src/lib/omega/chiron';
process.env.OMEGA_DET='1';
const enc:any='o200k_base';
console.log('cap =', CHIRON_MAX_TOKEN_SPAN_ENTRIES);
const ALL=fs.readFileSync('/tmp/lanes.txt','utf8').split('\n').filter(Boolean);
let hit=0;
for(const p of ALL){
  const text=fs.readFileSync(p,'utf8');
  const m=enumerateTokenSpans([text],enc);
  const size=m.size;
  const atCap = size>=CHIRON_MAX_TOKEN_SPAN_ENTRIES;
  if(atCap)hit++;
  // what is the best rough profit among the SURVIVING entries?
  let best=0,bestP='';
  for(const [ph,c] of m){ if(c<2||ph.length<2)continue; const t=countTokens(ph,enc); const r=c*(t-1)-t-1; if(r>best){best=r;bestP=ph;} }
  console.log(`${p.split('/').pop()!.padEnd(22)} mapSize ${String(size).padStart(7)} ${atCap ? '*** AT CAP ***' : ''} srcChars ${String(text.length).padStart(6)}  bestRough ${String(best).padStart(4)}`);
}
console.log(`\nlanes at cap: ${hit}/${ALL.length}`);
