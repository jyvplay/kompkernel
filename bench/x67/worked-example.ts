/** X67: a small PROBOLE message, printed in full, for a hand (LLM) decode. */
import { probolePlan, proboleContract, proboleRestore } from '../../src/lib/omega/probole';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const users = Array.from({ length: 20 }, (_, i) => ({ id: 100 + i, login: `u${i}`, site_admin: i % 5 === 0 }));
const src = JSON.stringify(users, null, 2) + '\n';
const plan = probolePlan(src, enc)!;
console.log('=== SOURCE (' + src.length + ' chars, ' + countTokens(src, enc) + ' tokens) ===');
console.log(src);
console.log('=== PROBOLE ENVELOPE (' + plan.transformed.length + ' chars, ' + countTokens(plan.transformed, enc) + ' tokens) ===');
console.log(plan.transformed);
console.log('=== standalone restore equals source:', proboleRestore(plan.transformed) === src);
console.log('=== contract tokens:', countTokens(proboleContract(), enc));
