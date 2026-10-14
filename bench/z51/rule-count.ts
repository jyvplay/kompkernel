import { countTokens } from '@/lib/omega/bpe';
const V: Record<string,string> = {
  R5: '∴ paths: bash brace expressions ({a,b} = the text before it, then a, then b; groups nest). Expand after other rules; one path per line.',
  R6: '∴ paths: bash brace expressions ({a,b} = text before it + a, and + b; groups nest). Expand after other rules; one path per line.',
  R7: '∴ paths: each line is a bash brace expression ({a,b} = text before it + a, + b; groups nest). Expand after other rules; one path per line.',
};
for (const [k, v] of Object.entries(V)) console.log(k.padEnd(8), String(countTokens(v, 'o200k_base')).padStart(4), JSON.stringify(v.slice(0, 50)));
