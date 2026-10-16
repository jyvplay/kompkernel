import fs from 'node:fs';
import { akolouthia2Encode } from '@/lib/omega/akolouthia2';
import { sigeEncode } from '@/lib/omega/sige';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { daedalusDualEncode } from '@/lib/omega/daedalus-dual';
const f = process.argv[2] ?? 'bench/holdout-work/meeting-transcript.txt';
const mode = process.argv[3] ?? 'alone';
const text = fs.readFileSync(f, 'utf8');
const enc = 'o200k_base' as const;
if (mode === 'dual-first') { const d = daedalusDualEncode(text, enc); console.log('dual first:', d.mode, d.messageTokens.o200k_base); }
if (mode === 'plain-first') { const d = daedalusEncode(text, enc); console.log('plain first:', d.mode, d.messageTokens); }
if (mode === 'sige-first') { const d = sigeEncode(text, enc); console.log('sige first:', d.mode, d.messageTokens); }
const a = akolouthia2Encode(text, enc);
console.log(mode, '=> akolouthia2 arm=', a.arm, 'marks=', a.marks, 'M=', a.messageTokens);
const a2 = akolouthia2Encode(text, enc);
console.log(mode, '=> again      arm=', a2.arm, 'marks=', a2.marks, 'M=', a2.messageTokens);
