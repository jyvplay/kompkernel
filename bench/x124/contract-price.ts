import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
const MARK = '~';
const V = [
  'A number after a letter has a space before it (none at line start or after a number); ~ before a number means no space, drop the ~.',
  'Number after a letter: a space before it (not at line start, not after a number); ~: no space.',
  'A number after a letter takes a space before it, except at line start or after a number; ~ marks one that takes none.',
  'Space before a number that follows a letter, not at line start or after a number; ~ = no space.',
  'After a letter put a space before each number (not at line start, not after a number); ~ means none.',
  'letter+number: put a space between (not at line start, not after a number); ~ means no space.',
  'Put a space before every number that follows a letter — not at line start, not after a number; ~ cancels it.',
];
for (const v of V) console.log(String(countTokens(v + '\n', enc)).padStart(3), v);
