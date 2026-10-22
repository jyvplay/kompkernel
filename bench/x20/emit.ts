import fs from 'node:fs';
import { morpheEncode } from '@/lib/omega/morphe';
const t = fs.readFileSync(process.argv[2], 'utf8');
const r = morpheEncode(t, 'o200k_base');
fs.writeFileSync(process.argv[3], r.decoderPrompt);
console.log(JSON.stringify({ arm: r.arm, M: r.messageTokens, ident: r.identityTokens, rules: r.rules, clauseTok: r.clauseTokens, hits: r.hits, chars: r.decoderPrompt.length, inTok: r.inTokens }));
