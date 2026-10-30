import * as fs from 'node:fs';
import { archetyponEncode } from '../../../src/lib/omega/archetypon';
import { chunkCacheStats, chunkCacheClear } from '../../../src/lib/omega/bpe';
const lane = process.argv[2]!;
const text = fs.readFileSync(lane, 'utf8');
chunkCacheClear();
const t0 = Date.now();
const r: any = archetyponEncode(text, 'o200k_base' as const);
console.log(JSON.stringify({ lane, ms: Date.now() - t0, exact: r.decoded === text, tokens: r.messageTokens, stats: chunkCacheStats() }, null, 1));
