/**
 * X26: CLAUSE AMORTIZATION for the AETOS number rule.
 *
 * AETOS currently appends a standalone sentence --
 *   " Numbers: expand 8 digits to YYYY-MM-DD."
 * -- after the parent's sentence. A sentence has a fixed toll: capital, the
 * word "Numbers", the colon, the period. Folding the same fact INTO the parent
 * sentence as another conjunct may cost less, because the parent sentence
 * already establishes ¶, the direction of reading and the output discipline.
 *
 * This measures, for each realistic shape set, the cost of
 *   (a) a standalone appended sentence
 *   (b) the same fact inlined into the parent's "After ¶ expand repeatedly;"
 *       clause as a second conjunct
 * and reports the difference. Seven lanes ship number shapes, so this is not
 * hypothetical.
 */
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const P = '¶';

const BASE = `Before ${P} new foreign letters name text to the next. After ${P} expand repeatedly; print result only.`;

const SHAPES: Array<{ id: string; plain: string }> = [
  { id: 'd8',            plain: 'expand 8 digits to YYYY-MM-DD' },
  { id: 't6',            plain: 'expand 6 digits to HH:MM:SS' },
  { id: 'd8+t6',         plain: 'expand 8 digits to YYYY-MM-DD and 6 digits to HH:MM:SS' },
  { id: 'dtT',           plain: 'expand 14 digits to dddd-dd-ddTdd:dd:dd' },
  { id: 'd8+dd:dd',      plain: 'expand 8 digits to YYYY-MM-DD and 4 digits to dd:dd' },
  { id: 'd8+mark',       plain: 'expand 8 digits to YYYY-MM-DD' },
];

console.log('base contract =', T(BASE), 'tokens\n');
console.log('shape'.padEnd(12), 'standalone'.padStart(11), 'inlined'.padStart(9), 'saving'.padStart(7));
for (const s of SHAPES) {
  const standalone = `${BASE} Numbers: ${s.plain}.`;
  // inline: "After ¶ expand repeatedly, and <plain>; print result only."
  const inlined = BASE.replace('expand repeatedly;', `expand repeatedly and ${s.plain};`);
  const a = T(standalone), b = T(inlined);
  console.log(s.id.padEnd(12), String(a).padStart(11), String(b).padStart(9), String(a - b).padStart(7));
}

// with the sentinel clause too
console.log('\n--- with a mark sentinel clause ---');
const SENT_STAND = ' A ^ before digits means expand them; drop the ^.';
const SENT_INLINE = ', where ^ before digits marks them for expansion';
for (const s of ['d8', 'd8+t6']) {
  const sh = SHAPES.find((x) => x.id === s)!;
  const a = T(`${BASE} Numbers: ${sh.plain}.${SENT_STAND}`);
  const b = T(BASE.replace('expand repeatedly;', `expand repeatedly and ${sh.plain}${SENT_INLINE};`));
  console.log(s.padEnd(12), 'standalone', String(a).padStart(4), '| inlined', String(b).padStart(4), '| saving', String(a - b).padStart(4));
}
