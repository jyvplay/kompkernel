import fs from 'node:fs';
import { stigmeEncode } from '@/lib/omega/stigme';
const f = process.argv[2];
const t = fs.readFileSync(f, 'utf8');
const r = stigmeEncode(t, 'o200k_base');
fs.writeFileSync(process.argv[3], r.decoderPrompt);
console.log(JSON.stringify({ arm: r.arm, M: r.messageTokens, ident: r.identityTokens, clauses: r.clauses, dates: r.dates, times: r.times, afters: r.afters, dropped: r.dropped, promptChars: r.decoderPrompt.length }));
