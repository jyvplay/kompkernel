import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
const f = process.argv[2];
const text = fs.readFileSync(f, 'utf8');
const t0 = Date.now();
const r = daedalusEncode(text, 'o200k_base');
console.log(f, 'in', r.inTokens, 'M', r.messageTokens, 'ms', Date.now() - t0, 'arm', r.winningArm, 'armsRun', r.armsRun);
