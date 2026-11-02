import * as fs from 'node:fs';
import { tokenStrings } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const t = fs.readFileSync('bench/holdout/lic-mit.txt', 'utf8');
const toks = tokenStrings(t, enc).map(x => x.s);
console.log(toks.length, JSON.stringify(toks.slice(0, 12)));
const seq = toks.map((_, i) => i);
const cnt = new Map<string, number>();
for (let i = 0; i + 1 < seq.length; i++) { const k = seq[i] * 100000 + seq[i + 1]; cnt.set(String(k), (cnt.get(String(k)) ?? 0) + 1); }
let best = 0; for (const [, c] of cnt) if (c > best) best = c;
console.log('pairs', cnt.size, 'best', best);
