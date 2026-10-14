import fs from 'node:fs';
import { elleipsisEncode } from '@/lib/omega/elleipsis';
const f = process.argv[2];
const text = fs.readFileSync(f, 'utf8');
const r = elleipsisEncode(text, 'o200k_base', { force: true });
fs.writeFileSync(f.replace(/\.txt$/, '.wire.txt'), r.wire);
fs.writeFileSync(f.replace(/\.txt$/, '.prompt.txt'), r.decoderPrompt);
console.log(`applied=${r.applied} exact=${r.exact} M=${r.messageTokens} plain=${r.plainMessageTokens} raw=${r.inTokens}`);
console.log(r.decoderPrompt);
