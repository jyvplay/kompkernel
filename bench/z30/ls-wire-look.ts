// Shows the A7 wire for ls-usr-bin: legend, first block header, sample rows (including symlink rows), and the A6 wire for comparison.
import fs from 'node:fs';
import { phalanxA7Encode, phalanxA7Decode } from '@/lib/omega/phalanx-a7';
import { phalanxA6Encode } from '@/lib/omega/phalanx-a6';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxA5Encode } from '@/lib/omega/phalanx-a5';
const enc = 'o200k_base' as const;
const t = fs.readFileSync('bench/z29/ops-real/ls-usr-bin.txt', 'utf8');
const a7 = phalanxA7Encode(t, enc);
const lines = a7.wire.split('\n');
console.log('A7 layer:', a7.layer, 'lines:', lines.length, 'tokens:', a7.outTokens, 'identity:', a7.inTokens, 'A6:', phalanxA6Encode(t, enc).outTokens);
console.log('--- A7 wire, first 8 lines ---');
console.log(lines.slice(0, 8).join('\n'));
const sym = lines.find((l) => l.includes(' -> '));
console.log('--- one symlink row in A7 wire ---'); console.log(sym);
console.log('--- decode exact:', phalanxA7Decode(a7.wire) === t);
// A5 legend fix (wrap layer label is "wrp")
const w = fs.readFileSync(fs.readdirSync('bench/z28/wrapped-real').map((f) => 'bench/z28/wrapped-real/' + f)[0], 'utf8');
const a5 = phalanxA5Encode(w, enc);
console.log('A5 layer on wrapped sample:', a5.layer, a5.layer !== 'a4' ? JSON.stringify(a5.wire.split('\n').slice(0, 2)).slice(0, 300) : '');
