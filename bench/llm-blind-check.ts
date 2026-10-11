/**
 * bench/llm-blind-check.ts — scores blind decodes. Byte-for-byte comparison, no model in the loop.
 *   node llm-blind-check.mjs <dir> <n>
 * Reads <dir>/hidden/orig_i.txt and <dir>/decode/dec_i.txt. Exit 1 if any sample differs.
 */
import fs from 'node:fs';
import path from 'node:path';

const [dir, nArg] = process.argv.slice(2);
const N = Number(nArg ?? 3);
let fails = 0;
for (let i = 1; i <= N; i++) {
  const orig = fs.readFileSync(path.join(dir, 'hidden', `orig_${i}.txt`), 'utf8');
  const decPath = path.join(dir, 'decode', `dec_${i}.txt`);
  if (!fs.existsSync(decPath)) { console.log(`sample ${i}: NO DECODE FILE`); fails++; continue; }
  const dec = fs.readFileSync(decPath, 'utf8');
  const ok = dec === orig;
  if (!ok) fails++;
  let firstDiff = -1;
  if (!ok) { for (let k = 0; k < Math.max(dec.length, orig.length); k++) if (dec[k] !== orig[k]) { firstDiff = k; break; } }
  console.log(`sample ${i}: ${ok ? 'EXACT' : 'MISMATCH'} origBytes=${Buffer.byteLength(orig)} decBytes=${Buffer.byteLength(dec)} firstDiffChar=${firstDiff}`);
}
console.log(`result: ${N - fails}/${N} exact`);
if (fails) process.exitCode = 1;
