// Blind self-decode receipt: write the one-chat prompt for a forced PARADEIGMA wire; the decoded text is produced by the model by hand, then compared by sha256.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { paradeigmaEncode } from '@/lib/omega/paradeigma';
const f = process.argv[2]; const text = fs.readFileSync(f, 'utf8');
const r = paradeigmaEncode(text, 'o200k_base', { force: true });
fs.writeFileSync(f.replace('.input.json', '.prompt.txt'), r.decoderPrompt);
console.log(`applied=${r.applied} templates=${r.templates} lines=${r.elidedLines} M=${r.messageTokens} plain=${r.plainMessageTokens} exact=${r.exact} sha256(input)=${createHash('sha256').update(text, 'utf8').digest('hex')}`);
