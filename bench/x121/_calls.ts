import * as fs from 'node:fs';
import { countTokens, chunkCacheStats, tailMemoStats } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { prolepsisStats } from '../../src/lib/omega/prolepsis';
Object.assign(process.env, { OMEGA_DET:'1', OMEGA_NO_MEMO:'1', OMEGA_ENGRAM:'0', OMEGA_OURA_MEMO:'0',
  OMEGA_NO_OROTHESIA:'1', OMEGA_SYNEDRIA:'1', OMEGA_SYNEDRIA_CHAIN:'1', OMEGA_ENALLAGE:'1', OMEGA_MEKOS:'1', OMEGA_SYNTHESIS:'1' });
const enc='o200k_base' as const;
const p = process.argv[2] ?? 'bench/holdout-x41/node-help.txt';
const text = fs.readFileSync(p,'utf8');
const t=performance.now();
const out = tagstackEncode(text, enc);
console.log(`${p} ${(performance.now()-t).toFixed(0)}ms tok=${countTokens(out.message,enc)}`);
console.log('chunk', JSON.stringify(chunkCacheStats()));
console.log('tail ', JSON.stringify(tailMemoStats()));
console.log('prol ', JSON.stringify(prolepsisStats()));
