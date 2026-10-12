import fs from 'node:fs';
import { phalanxA4Encode } from '@/lib/omega/phalanx-a4';
const t = fs.readFileSync('bench/holdout-ops/git-numstat.txt', 'utf8');
const r = phalanxA4Encode(t, 'o200k_base');
console.log(r.layer, r.outTokens, JSON.stringify(r.wire.slice(0, 420)));
