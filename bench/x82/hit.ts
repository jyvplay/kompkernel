import * as fs from 'node:fs';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
import * as BF from '../../src/lib/omega/bpe-fast';
const enc: any = 'o200k_base';
const S = fs.readFileSync(process.argv[2], 'utf8');
const r: any = tagstackFrontier(S, enc);
console.log(`${process.argv[2]} tok=${r.messageTokens} hits=${BF.chunkHits} misses=${BF.chunkMisses} hitRate=${(BF.chunkHits/(BF.chunkHits+BF.chunkMisses)*100).toFixed(1)}%`);
