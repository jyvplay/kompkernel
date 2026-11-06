/** X78 — COLD READ. Print the KERMA message for psql-output exactly as a bare LLM
 *  would receive it: one chat box, no skills file, no system prompt, no docs. */
import * as fs from 'node:fs';
import { kermaEncode } from '../../src/lib/omega/kerma';
const enc: any = 'o200k_base';
const r: any = kermaEncode(fs.readFileSync('bench/holdout-tbl/psql-output.txt', 'utf8'), enc);
console.log(r.message);
