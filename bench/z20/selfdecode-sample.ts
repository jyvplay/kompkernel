// Small in-context readability sample: prints the P2 wire of 6 real lines (git-log-iso), no answer key.
import fs from 'node:fs';
import { phalanx2Encode } from '@/lib/omega/phalanx2';
const t = fs.readFileSync('bench/z20/samples/ls-omega-full-iso.txt', 'utf8').split('\n').slice(0, 9).join('\n');
const r = phalanx2Encode(t, 'o200k_base');
fs.writeFileSync('/home/user/z20-work/selfdecode.wire.txt', r.wire);
fs.writeFileSync('/home/user/z20-work/selfdecode.truth.txt', t);
console.log(r.wire);
