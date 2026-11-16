import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const p = process.argv[2] ?? 'bench/holdout-x41/ls-l-real.txt';
const t = fs.readFileSync(p, 'utf8');
const t0 = Date.now();
const r = tagstackEncode(t, 'o200k_base');
console.log('tokens', r.messageTokens, 'exact', r.decoded === t, 'ms', Date.now() - t0);
