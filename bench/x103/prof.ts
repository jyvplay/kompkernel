import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const text = fs.readFileSync('bench/holdout-x41/ps-aux-real.txt', 'utf8');
const t0 = Date.now();
const R: any = tagstackEncode(text, enc);
console.log('ps-aux-real', Date.now() - t0, 'ms tokens', R.messageTokens, 'parent', R.parentCodec);
