import * as fs from 'node:fs';
import { tagstackEncode, tagstackMemoClear } from '../../src/lib/omega/tagstack';
import { synedriaReset } from '../../src/lib/omega/synedria';
import { chunkCacheStats } from '../../src/lib/omega/bpe';
Object.assign(process.env, { OMEGA_DET: '1', OMEGA_NO_MEMO: '1', OMEGA_ENGRAM: '0', OMEGA_OURA_MEMO: '0',
  OMEGA_NO_OROTHESIA: '1', OMEGA_SYNEDRIA: '1', OMEGA_SYNEDRIA_CHAIN: '1', OMEGA_ENALLAGE: '1',
  OMEGA_MEKOS: '1', OMEGA_SYNTHESIS: '1', OMEGA_COUNT_PREFIX: process.env.X120_PREFIX ?? '1' });
const path = process.argv[2] ?? 'bench/holdout-x42/findmnt.txt';
tagstackMemoClear(); synedriaReset();
const t = performance.now();
const r = tagstackEncode(fs.readFileSync(path, 'utf8'), 'o200k_base');
console.log(path, r.messageTokens, r.decoded === fs.readFileSync(path, 'utf8'), Math.round(performance.now() - t), 'ms');
console.log(JSON.stringify(chunkCacheStats()));
