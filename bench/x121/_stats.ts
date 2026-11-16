import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { chunkCacheStats, tailMemoStats } from '../../src/lib/omega/bpe';
Object.assign(process.env, { OMEGA_DET:'1', OMEGA_NO_MEMO:'1', OMEGA_ENGRAM:'0', OMEGA_OURA_MEMO:'0',
  OMEGA_NO_OROTHESIA:'1', OMEGA_SYNEDRIA:'1', OMEGA_SYNEDRIA_CHAIN:'1', OMEGA_ENALLAGE:'1',
  OMEGA_MEKOS:'1', OMEGA_SYNTHESIS:'1' });
const lane = process.argv[2]!;
const text = fs.readFileSync(lane,'utf8');
const t = performance.now();
const r = tagstackEncode(text, 'o200k_base');
console.log(lane, 'tok', r.messageTokens, 'ms', Math.round(performance.now()-t));
console.log('chunkCache', JSON.stringify(chunkCacheStats()));
console.log('tailMemo', JSON.stringify(tailMemoStats()));
