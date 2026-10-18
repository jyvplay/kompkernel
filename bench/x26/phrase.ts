/**
 * X26: finalize the braided phrasing.
 *
 * The inlined sentinel conjunct must not lose the "drop the marker" fact -- the
 * decoder has to know the sentinel is removed, not just that it marks. Score
 * phrasings that keep it, and pick the cheapest that is still complete.
 */
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const P = '¶';
const HEAD = `Before ${P} new foreign letters name text to the next.`;

const DIG: string[] = [
  'expand 8 digits to YYYY-MM-DD',
  'restore 8 digits to YYYY-MM-DD',
  '8 digits become YYYY-MM-DD',
  'make 8 digits into YYYY-MM-DD',
];
console.log('=== digit conjunct (inside "After ¶ expand repeatedly and <X>; print result only.") ===');
for (const d of DIG) {
  console.log('  ' + String(T(`${HEAD} After ${P} expand repeatedly and ${d}; print result only.`)).padStart(3), ' ', d);
}
console.log('\n=== multi-shape joining ===');
const J: Array<[string, string]> = [
  ['comma-and', 'expand 8 digits to YYYY-MM-DD, 6 digits to HH:MM:SS and 4 digits to dd:dd'],
  ['and-and',   'expand 8 digits to YYYY-MM-DD and 6 digits to HH:MM:SS and 4 digits to dd:dd'],
  ['colonOnly', 'expand 8 digits to YYYY-MM-DD, 6 to HH:MM:SS, 4 to dd:dd'],
];
for (const [id, s] of J)
  console.log('  ' + String(T(`${HEAD} After ${P} expand repeatedly and ${s}; print result only.`)).padStart(3), ' ', id);

console.log('\n=== sentinel conjunct (must still say the marker is dropped) ===');
const S: string[] = [
  'where ^ before digits marks them for expansion and is dropped',
  'where ^ before digits marks them; drop the ^',
  'where ^ before digits marks them and ^ is removed',
  '^ before digits marks them; drop it',
  '^ before a run marks it; drop the ^',
  'marking runs with ^ for expansion, then drop the ^',
];
for (const s of S) {
  const full = `${HEAD} After ${P} expand repeatedly and expand 8 digits to YYYY-MM-DD, ${s}; print result only.`;
  console.log('  ' + String(T(full)).padStart(3), ' ', s);
}
console.log('\n=== escape-mode sentinel ===');
const E: string[] = [
  'where ^ after digits means leave them; drop the ^',
  '^ after digits means leave them; drop the ^',
  '^ after a run means leave it; drop the ^',
];
for (const s of E) {
  const full = `${HEAD} After ${P} expand repeatedly and expand 8 digits to YYYY-MM-DD, ${s}; print result only.`;
  console.log('  ' + String(T(full)).padStart(3), ' ', s);
}
console.log('\n=== flat (non-nesting tape) variant ===');
console.log('  nested', T(`${HEAD} After ${P} expand repeatedly; print result only.`),
  '| flat', T(`${HEAD} After ${P} expand; print result only.`));
