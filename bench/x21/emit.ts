import fs from 'node:fs';
import { syzeuxisEncode } from '@/lib/omega/syzeuxis';
const t = fs.readFileSync(process.argv[2], 'utf8');
const r = syzeuxisEncode(t, 'o200k_base' as any);
fs.writeFileSync(process.argv[3], r.decoderPrompt);
console.log(JSON.stringify({ arm: r.arm, M: r.messageTokens, ident: r.inTokens, rules: r.rules, clauses: r.clauses, transpose: r.transpose, arms: r.armTokens, chars: r.decoderPrompt.length }));
