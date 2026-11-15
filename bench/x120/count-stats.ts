import * as fs from 'node:fs';
import { tagstackEncode, tagstackMemoClear } from '../../src/lib/omega/tagstack';
import { synedriaReset } from '../../src/lib/omega/synedria';
import { chunkCacheStats } from '../../src/lib/omega/bpe';
Object.assign(process.env, { OMEGA_DET: '1', OMEGA_NO_MEMO: '1', OMEGA_ENGRAM: '0', OMEGA_OURA_MEMO: '0',
  OMEGA_NO_OROTHESIA: '1', OMEGA_SYNEDRIA: '1', OMEGA_SYNEDRIA_CHAIN: '1', OMEGA_ENALLAGE: '1',
  OMEGA_MEKOS: '1', OMEGA_SYNTHESIS: '1' });
const path = process.argv[2] ?? 'bench/holdout-x42/findmnt.txt';
tagstackMemoClear(); synedriaReset();
const before = chunkCacheStats();
const t = performance.now();
const r = tagstackEncode(fs.readFileSync(path, 'utf8'), 'o200k_base');
const ms = performance.now() - t;
const after = chunkCacheStats();
console.log(path, r.messageTokens, Math.round(ms), 'ms');
console.log('before', JSON.stringify(before));
console.log('after ', JSON.stringify(after));
const d: Record<string, number> = {};
for (const k of Object.keys(after as any)) if (typeof (after as any)[k] === 'number') d[k] = (after as any)[k] - ((before as any)[k] ?? 0);
console.log('delta ', JSON.stringify(d));
fs.writeFileSync('bench/x120/receipts/count-stats.json', JSON.stringify({ path, tokens: r.messageTokens, ms, before, after, delta: d }, null, 2) + '\n');
