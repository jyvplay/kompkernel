// Z37: print the DAEDALUS wire (first N chars) for one file.
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
const text = fs.readFileSync(process.argv[2], 'utf8');
const d = daedalusEncode(text);
console.log('messageTokens', d.messageTokens, 'contract', d.contractTokens, 'arm', d.winningArm);
console.log(d.wire.slice(0, Number(process.argv[3] ?? 900)));
