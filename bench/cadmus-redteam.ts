/** Independent Cadmus gate: exactness, portfolio dominance, and adversarial inputs. */
import { cadmusEncode } from '../src/lib/omega/cadmus';
import { countTokens } from '../src/lib/omega/bpe';

const cases = [
  '', 'a', ' '.repeat(200),
  'The quick brown fox jumps over the lazy dog. '.repeat(80),
  JSON.stringify({ users: Array.from({ length: 40 }, (_, i) => ({ id: i, name: 'user' + i, active: true })) }),
  '0123456789abcdef'.repeat(300),
  'function f(x){return x*x;}\n'.repeat(120),
];

for (const text of cases) {
  const r = await cadmusEncode(text);
  const min = Math.min(...r.candidates.filter(c => c.exact).map(c => c.tokens));
  if (!r.exact || r.outTokens !== min || r.decoded !== text) {
    throw new Error(`CADMUS gate failed: ${JSON.stringify({ length: text.length, r, min })}`);
  }
  console.log(JSON.stringify({ length: text.length, input: countTokens(text, 'o200k_base'), output: r.outTokens, winner: r.winner, candidates: r.candidates }));
}
console.log('CADMUS_REDTEAM_OK');
