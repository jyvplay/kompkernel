/**
 * X132 SPEED BASELINE. Encodes every lane and reports total time plus a hash of
 * every message, so that any candidate optimisation can be accepted ONLY if the
 * hash is unchanged (output-identical) and the time is lower.
 * MEMO is left at the production default (enabled) unless OMEGA_NO_MEMO=1 is set.
 */
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { tagstackEncode, tagstackMemoClear } from '../../src/lib/omega/tagstack';
import { chunkCacheClear, tailMemoClear } from '../../src/lib/omega/bpe';
import { prolepsisReset } from '../../src/lib/omega/prolepsis';
const enc:any='o200k_base';
const lanes=(process.env.LANES?process.env.LANES.split(','):
  fs.readFileSync('bench/x109/lanes29.txt','utf8').split('\n')).filter(Boolean);
const clear=()=>{ tagstackMemoClear(); chunkCacheClear(); tailMemoClear(); prolepsisReset(); };
let total=0, tokTot=0; const h=crypto.createHash('sha256');
const perLane:string[]=[];
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8');
  clear();
  const t0=Date.now();
  const r:any=tagstackEncode(text,enc);
  const ms=Date.now()-t0;
  total+=ms; tokTok(r);
  h.update(r.message);
  perLane.push(`${p.split('/').pop()}:${ms}`);
}
function tokTok(r:any){ tokTot+=r.messageTokens; }
h.update(String(tokTot));
console.log(`TOTAL_MS ${total}`);
console.log(`SIGMA_TOKENS ${tokTot}`);
console.log(`MESSAGE_SHA256 ${h.digest('hex')}`);
console.log(`PERLANE ${perLane.join(' ')}`);
