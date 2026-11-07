/** X81 — is a space before a DIGIT its own chunk? (\p{N}{1,3} has no leading-space
 *  allowance, unlike the word and punctuation alternatives which both do.) */
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const show = (s: string) => {
  const n = countTokens(s, enc);
  const parts = tokenStrings(s, enc).map((t) => JSON.stringify(t.s)).join(' ');
  console.log(`${JSON.stringify(s).padEnd(30)} ${String(n).padStart(3)} tok   ${parts}`);
};
console.log('--- space before digit vs none ---');
for (const [a, b] of [['word 123','word123'], ['size 4096','size4096'], ['a 1','a1'],
                      ['file 12 txt','file12txt'], ['x 100 y 200','x100 y200']]) { show(a); show(b); console.log(''); }
console.log('--- control: space before letter (should be free) ---');
show('word abc'); show('wordabc');
console.log('\n--- control: space before punctuation (should be free) ---');
show('a , b'); show('a, b');
console.log('\n--- real-ish lines ---');
show('eth0     1500  rx  4096');
show('eth0     1500  rx 4096');
const L1 = '-rw-r--r-- 1 user group 4096 Jan  2 08:00 alpha.txt\n'.repeat(4);
const L2 = '-rw-r--r-- 1 user group4096 Jan  2 08:00 alpha.txt\n'.repeat(4);
console.log(`\n4x ls -l line, with space before size : ${countTokens(L1, enc)} tok`);
console.log(`4x ls -l line, space before size gone  : ${countTokens(L2, enc)} tok`);
