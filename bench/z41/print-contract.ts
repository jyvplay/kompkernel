// Z41: print the exact DAEDALUS-D decoder instruction for one file (no wire body), plus its token counts.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { daedalusEncode } from '@/lib/omega/daedalus';
const t = fs.readFileSync(process.argv[2], 'utf8');
const r = daedalusEncode(t, 'o200k_base', { dualTokenizer: true });
const head = r.decoderPrompt.startsWith(r.wire) ? r.decoderPrompt.slice(r.wire.length) : "<prompt does not start with wire>: " + r.decoderPrompt.slice(0, 80);
console.log(JSON.stringify(head));
console.log('ops', JSON.stringify(r.ops), 'script', r.script, 'o200k', countTokens(head, 'o200k_base'), 'cl100k', countTokens(head, 'cl100k_base'));
