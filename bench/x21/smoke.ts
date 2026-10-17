import { countTokens } from '@/lib/omega/bpe';
import { morpheEncode } from '@/lib/omega/morphe';
import fs from 'node:fs';
const t = fs.readFileSync(process.argv[2], 'utf8');
const m = morpheEncode(t, 'o200k_base');
console.log(JSON.stringify({ file: process.argv[2].split('/').pop(), ident: m.identityTokens, M: m.messageTokens, rules: m.rules, wire: m.armTag }));
