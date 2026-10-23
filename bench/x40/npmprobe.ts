// Is npm-ls slow because of PERITROPE, or because of the PARENT stack?
import { readFileSync } from 'node:fs';
import { ouraEncode } from '@/lib/omega/oura';
import { peritropeEncode } from '@/lib/omega/peritrope';
const enc: any = 'o200k_base';
const t = readFileSync('bench/holdout-ops/npm-ls.txt', 'utf8');
console.log('chars', t.length);
let a = Date.now();
const o: any = ouraEncode(t, enc);
console.log('ouraEncode        ', ((Date.now() - a) / 1000).toFixed(1) + 's', 'tok=' + o.messageTokens);
a = Date.now();
const p: any = peritropeEncode(t, enc, { peritropeSearch: { width: 1, depth: 1, cap: 2 } });
console.log('peritrope W1D1C2  ', ((Date.now() - a) / 1000).toFixed(1) + 's', 'tok=' + p.messageTokens,
  'peri=' + p.peritrope, 'k=' + p.peritropePairs.length, 'gain=' + p.peritropeGain);
