/**
 * X96 — IS THE SHIPPED CHAIN DETERMINISTIC UNDER OMEGA_DET=1?  apt-real.txt returned 864 on one
 * process and 850 on the next with identical input and identical environment.  This encodes the
 * same lane N times in one process (memo off) and prints the token count and the SHA-256 of the
 * complete message each time.  Any variation is a determinism defect in the stack, not noise in
 * the measurement, and it would qualify every number this turn reports.
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const p = process.argv[2];
const N = Number(process.argv[3] ?? 3);
const text = fs.readFileSync(p, 'utf8');
const seen = new Map<string, number>();
for (let i = 0; i < N; i++) {
  const t = Date.now();
  const r: any = tagstackEncode(text, enc);
  const sha = createHash('sha256').update(r.message, 'utf8').digest('hex').slice(0, 16);
  seen.set(sha, (seen.get(sha) ?? 0) + 1);
  console.log(`run ${i}: tokens=${r.messageTokens} sha=${sha} exact=${r.decoded === text} parent=${r.parentCodec} ${Date.now() - t}ms`);
}
console.log(`distinct messages over ${N} runs: ${seen.size}`);
