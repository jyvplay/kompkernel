import fs from 'node:fs';
import { stigmeEncode } from '@/lib/omega/stigme';
const t = fs.readFileSync(process.argv[2], 'utf8');
const r = stigmeEncode(t, 'o200k_base');
fs.writeFileSync(process.argv[3], r.decoderPrompt);
console.log(JSON.stringify({ arm: r.arm, M: r.messageTokens, ident: r.identityTokens, clauses: r.clauses, dates: r.dates, chars: r.decoderPrompt.length, inTok: r.inTokens }));
