// External comparison (json-pkg only: the one corpus JSON file that Tokenfold accepts). Tokenfold is not byte-exact there.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxA2Encode } from '@/lib/omega/phalanx-a2';
const enc = 'o200k_base' as const;
const inp = fs.readFileSync('bench/holdout/json-pkg.txt', 'utf8');
const tfOut = fs.readFileSync('/home/user/z20-work/tf/json-pkg.txt.out', 'utf8');
const a2 = phalanxA2Encode(inp, enc);
console.log(`json-pkg identity=${countTokens(inp, enc)} tokenfold(not byte-exact)=${countTokens(tfOut, enc)} PHALANX-A2(byte-exact)=${a2.outTokens}`);
