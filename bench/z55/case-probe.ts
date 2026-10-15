// z55: capitalization probe. o200k tokens of text vs its lowercase form, and the number of uppercase letters.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const low = t.toLowerCase();
  const upper = (t.match(/\p{Lu}/gu) ?? []).length;
  const letters = (t.match(/\p{L}/gu) ?? []).length;
  const a = countTokens(t, 'o200k_base'), b = countTokens(low, 'o200k_base');
  console.log(JSON.stringify({ lane: f.split('/').pop(), chars: t.length, tokens: a, lowerTokens: b, lowerDelta: b - a, upper, letters, upperPct: +(100 * upper / Math.max(1, letters)).toFixed(2) }));
}
