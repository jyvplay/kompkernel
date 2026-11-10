/**
 * X97 — IS THE SHIPPED ENCODER DETERMINISTIC UNDER OMEGA_DET=1?  X97 found the base chain for
 * apt-real reporting 858 (isolated), 874 (RUN L pass 2) and 850 (run K) for the same bytes.
 * If `tagstackEncode` is not a pure function of (text, enc, env), then every "exact 29/29" receipt in
 * this repository certifies a distribution, not a configuration, and the frontier numbers are
 * not reproducible.  This runs the same lane 5x in ONE process and 5x across separate processes.
 */
import * as fs from 'node:fs';
import { countTokensExact } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { createHash } from 'node:crypto';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const path = process.argv[2] ?? 'bench/holdout-x41/apt-real.txt';
const reps = Number(process.argv[3] ?? 3);
const text = fs.readFileSync(path, 'utf8');
const out: string[] = [];
for (let i = 0; i < reps; i++) {
  const r: any = tagstackEncode(text, enc);
  const n = countTokensExact(r.message, enc);
  const sha = createHash('sha256').update(r.message).digest('hex').slice(0, 12);
  console.log(`rep ${i} claimed=${r.messageTokens} recount=${n} exact_ok=${r.decoded === text} parent=${r.parentCodec} sha=${sha}`);
  out.push(`${n}:${sha}`);
}
console.log(`\n${path}: distinct outcomes in-process = ${new Set(out).size} / ${reps}`);
