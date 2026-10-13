// Z42: one DAEDALUS-D encode, for CPU profiling (node --cpu-prof).
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
const t = fs.readFileSync(process.argv[2], 'utf8');
const t0 = Date.now();
const r = daedalusEncode(t, 'o200k_base', { dualTokenizer: true, maxArms: 1 });
console.log(JSON.stringify({ ms: Date.now() - t0, o: r.messageTokens, arm: r.winningArm, mode: r.mode }));
