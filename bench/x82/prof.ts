import * as fs from 'node:fs';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const p = process.argv[2];
const S = fs.readFileSync(p, 'utf8');
const t0 = Date.now();
const r: any = tagstackFrontier(S, enc);
console.log(`${p} tok=${r.messageTokens} ms=${Date.now() - t0}`);
