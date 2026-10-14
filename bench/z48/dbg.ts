import fs from 'node:fs';
import { induceRules, sentenceOf } from '@/lib/omega/elleipsis';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as const;
const text = fs.readFileSync(process.argv[2], 'utf8');
const r = induceRules(text, enc, 24, 3);
console.log(r.rules.map((x, i) => `${JSON.stringify(x)} ×${r.counts[i]} :: ${sentenceOf(x)} [${countTokens(sentenceOf(x), enc)} tok]`).join('\n'));
console.log('reduced raw', countTokens(r.reduced, enc), 'vs', countTokens(text, enc));
console.log(r.reduced.split('\n').slice(0, 4).join('\n'));
