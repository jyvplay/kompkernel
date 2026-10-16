import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { chironDecoderPrompt } from '@/lib/omega/chiron';
import { daedalusDualEncode } from '@/lib/omega/daedalus-dual';
import { AKOLOUTHIA2_CONTRACT } from '@/lib/omega/akolouthia2';
const enc = 'o200k_base' as const;
const f = process.argv[2];
const text = fs.readFileSync(f, 'utf8');
const d: any = daedalusDualEncode(text, enc);
const full = chironDecoderPrompt(d.wire);
const parts = full.split('\n');
console.log('--- DAEDALUS-D contract text (after the wire):');
console.log(parts[1]);
console.log('DAEDALUS-D contract tok:', countTokens(parts[1], enc));
const cands: string[] = [
  'New Cyrillic letter before ¶ starts a rule to the next new Cyrillic or ¶. After ¶, expand rules recursively; print only the result.',
  'New Cyrillic letters start rules running to the next new one; expand all letters after ¶ recursively and print only the result.',
  'New Cyrillic letter = rule to the next new one. Expand every letter after ¶; print only the expansion.',
  'Cyrillic: new letter starts a rule to the next new letter. Expand after ¶; print the expansion only.',
  'Each new Cyrillic letter starts a rule to the next one; expand all after ¶; output the expansion.',
  'New Cyrillic letter starts a rule to the next new letter; expand after ¶ recursively; print result only.',
  'Cyrillic letters are rules: each new one runs to the next; expand after ¶; print expansion.',
  'Rules are Cyrillic: new letter = text to next new letter; expand after ¶; print only that.',
  'Cyrillic glyphs are rules running to the next new glyph; expand after ¶; print the expansion.',
  'Expand: each new Cyrillic letter = rule to next; after ¶ output the expansion.',
];
for (const c of cands) console.log(String(countTokens(c, enc)).padStart(3), c);
console.log('--- AKOLOUTHIA-2 contract:', JSON.stringify(AKOLOUTHIA2_CONTRACT), countTokens(AKOLOUTHIA2_CONTRACT, enc));
