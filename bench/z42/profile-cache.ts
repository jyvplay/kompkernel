// Z42: DAEDALUS-D on one file with a chosen gpt-tokenizer merge-cache size (CACHE env; 'default' leaves the library default).
import fs from 'node:fs';
import { setMergeCacheSize as s200 } from 'gpt-tokenizer/encoding/o200k_base';
import { setMergeCacheSize as s100 } from 'gpt-tokenizer/encoding/cl100k_base';
import { daedalusEncode } from '@/lib/omega/daedalus';
const cfg = process.env.CACHE ?? 'default';
if (cfg !== 'default') { s200(Number(cfg)); s100(Number(cfg)); }
const t = fs.readFileSync(process.argv[2], 'utf8');
const t0 = Date.now();
const r = daedalusEncode(t, 'o200k_base', { dualTokenizer: true, maxArms: 1 });
console.log(JSON.stringify({ cache: cfg, ms: Date.now() - t0, o: r.messageTokens, c: r.mode === 'daedalus' ? r.messageTokens : null, wireHash: require('crypto').createHash('sha256').update(r.wire).digest('hex').slice(0, 16), arm: r.winningArm, mode: r.mode, exact: r.exact }));
