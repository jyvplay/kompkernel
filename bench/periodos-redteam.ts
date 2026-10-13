/**
 * bench/periodos-redteam.ts — adversarial round-trip test for PERIODOS.
 * Deterministic (seeded PRNG). Every case must satisfy:
 *   encoder.decoded === text, and the reader path (periodosStackDecode) returns text
 *   for every non-raw winner. Raw winners are identity by definition.
 * Cases mix: multiple widths, long words wider than W, double spaces, leading spaces,
 * CRLF, tabs, all six marker glyphs present, digit-led words, 2-line blocks,
 * missing or doubled trailing newlines, and ragged (non-greedy) blocks.
 */
import { periodosEncode, periodosStackDecode, periodosSelfTest } from '../src/lib/omega/periodos';
import { greedyFill } from '../src/lib/omega/stichos';

let seed = 0x9e3779b9;
const rnd = (n: number) => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
const VOCAB = 'the a an of in on policy document retention 2026 v1.2 (see) "quoted" x-ray naïve Ⅻ ümlaut aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa https://example.com/a/b/c'.split(' ');
const word = () => VOCAB[rnd(VOCAB.length)];
const sentence = (n: number) => Array.from({ length: n }, word);

function paragraph(): string {
  const words = sentence(20 + rnd(120));
  const kind = rnd(10);
  if (kind < 5) return greedyFill(words, 40 + rnd(60)).join('\n');          // greedy at one width
  if (kind < 7) return greedyFill(words, 30 + rnd(40)).join('\n') + '\n' + words[0]; // greedy + extra line
  if (kind < 8) return words.join(' ');                                     // unwrapped
  if (kind < 9) return words.map((w, i) => (i % 9 === 8 ? w + '\n' : w + ' ')).join('').trimEnd(); // ragged
  return ' ' + greedyFill(words, 50).join('\n');                            // leading space
}

function document(): string {
  const parts: string[] = [];
  const n = 1 + rnd(6);
  for (let i = 0; i < n; i++) parts.push(paragraph());
  let t = parts.join(rnd(8) === 0 ? '\n\n\n' : '\n\n');
  if (rnd(6) === 0) t = t.replace(/\n/g, '\r\n');
  if (rnd(9) === 0) t += '\t';
  if (rnd(7) === 0) t = '¦◆⧫◊⁋⟂ ' + t;                                         // all marks present
  if (rnd(5) === 0) t += '\n';
  if (rnd(11) === 0) t += '\n\n';
  return t;
}

const failures: string[] = [];
let cases = 0, nonRaw = 0;
for (const c of periodosSelfTest()) { cases++; if (!c.ok) failures.push(`selftest: ${c.name} ${c.detail}`); }
for (let i = 0; i < 300; i++) {
  const text = document();
  cases++;
  let r;
  try { r = periodosEncode(text); } catch (e: any) { failures.push(`case ${i}: encoder threw ${e?.message}`); continue; }
  if (r.decoded !== text) { failures.push(`case ${i}: encoder decoded !== input (winner ${r.winner})`); continue; }
  if (r.winner !== 'raw') {
    nonRaw++;
    const back = periodosStackDecode(r.wire);
    if (back !== text) failures.push(`case ${i}: stack decode mismatch (winner ${r.winner})`);
  }
}
console.log(`cases=${cases} non-raw-winners=${nonRaw} failures=${failures.length}`);
for (const f of failures.slice(0, 20)) console.log('FAIL', f);
if (failures.length) process.exitCode = 1;
