import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const head = 'Letters before \u00b6 name the phrases after them. Then ';
const variants = [
  'and 8 digits become YYYY-MM-DD, 4 digits become dd:dd, where ^ before digits marks them; drop it',
  'and 8 digits become YYYY-MM-DD, 4 digits become dd:dd, ^ marks those digits; drop it',
  'and 8 digits become YYYY-MM-DD, 4 digits become dd:dd; drop any ^',
  'and 8 digits become YYYY-MM-DD, 4 digits become dd:dd (^ means skip; drop it)',
  'and 8 digits become YYYY-MM-DD, 4 digits become dd:dd, ignoring ^-marked digits',
  'and 8 digits become YYYY-MM-DD, 4 digits become dd:dd, where ^ marks them; drop it',
  'and 8 digits become YYYY-MM-DD, 4 digits become dd:dd; ^ marks an exception; drop the ^',
];
for (const v of variants) console.log(String(T(head + 'expand repeatedly ' + v + '; print result only.')).padStart(3), v);
console.log('\n--- 1-shape (git-log-iso) ---');
const v1 = [
  'and 14 digits become dddd-dd-ddTdd:dd:dd',
  'and 14 digits become dddd-dd-ddTdd:dd:dd; no sentinel',
];
for (const v of v1) console.log(String(T(head + 'expand repeatedly ' + v + '; print result only.')).padStart(3), v);
