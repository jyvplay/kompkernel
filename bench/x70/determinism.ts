/**
 * X70 test 1: is the frontier's token count reproducible?
 * Same lane, same binary, N runs, with and without OMEGA_DET=1.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const path = process.argv[2], n = +(process.argv[3] ?? 3);
const text = fs.readFileSync(path, 'utf8');
const seen: number[] = [];
for (let i = 0; i < n; i++) {
  const r: any = tagstackEncode(text, enc);
  if (r.decoded !== text) throw new Error('decode mismatch');
  seen.push(r.messageTokens);
}
const uniq = [...new Set(seen)].sort((a, b) => a - b);
console.error(`${path} runs=${seen.join(',')} distinct=${uniq.length} spread=${uniq[uniq.length - 1] - uniq[0]}`);
