import * as fs from 'node:fs';
import { tagstackEncode, tagstackMemoClear } from '../../src/lib/omega/tagstack';
import { chunkCacheClear, tailMemoClear } from '../../src/lib/omega/bpe';
import { prolepsisReset } from '../../src/lib/omega/prolepsis';
const enc='o200k_base' as const;
const clear = () => { tagstackMemoClear(); chunkCacheClear(); tailMemoClear(); prolepsisReset(); };
const lane = process.env.LANE ?? 'bench/holdout-x41/apt-real.txt';
const src = fs.readFileSync(lane,'utf8');
clear(); tagstackEncode(src, enc);           // JIT warm
clear();
const t0=Date.now();
const r = tagstackEncode(src, enc);
console.log(`${lane} ms=${Date.now()-t0} exact=${r.decoded===src}`);
