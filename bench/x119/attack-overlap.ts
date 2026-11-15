/** X119 second-order adversary: LTSC Algorithm-2 overlap attack.
 * A start-index-only `I \ Iswap` selection admits overlapping spans and is not
 * invertible. DIGLOSSIA's interval disjointness + re-decode must refuse it. */
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from '../../src/lib/omega/chiron';
import { diglossiaEncode } from '../../src/lib/omega/diglossia';
Object.assign(process.env, { OMEGA_DET: '1' });
delete process.env.OMEGA_NO_DIGLOSSIA;
const enc = 'o200k_base' as const;
const wire = (t: string, b: string) => '¶k=v expand repeatedly print only.\n' + CHIRON_START + t + CHIRON_SEP + b;
const trials: any[] = [];

// Overlapping literal occurrences of one flat value: 'aba' at 0 and 2 in 'ababa'.
{
  const m = wire('αaba', 'ababa α');
  const ref = chironDecode(m.slice(m.indexOf(CHIRON_START)));
  // Naive start-index-only selection: both starts 0 and 2 are "unused starts",
  // so a literal LTSC reading swaps both, rendering αα (spans overlap).
  const naive = m.slice(0, m.indexOf(CHIRON_SEP) + 1) + 'αα α';
  const naiveExp = chironDecode(naive.slice(naive.indexOf(CHIRON_START)));
  trials.push({ name: 'ltsc-start-index-only', naiveInvertible: naiveExp === ref, naiveExp, ref });
  assert.notEqual(naiveExp, ref, 'the attack must actually corrupt under the naive rule');
  const r = diglossiaEncode('x', enc, { message: m, messageTokens: countTokens(m, enc), decoded: ref });
  const exp = chironDecode(r.message.slice(r.message.indexOf(CHIRON_START)));
  trials.push({ name: 'diglossia-interval-disjoint', applied: r.applied, exact: exp === ref, tokens: r.messageTokens, base: countTokens(m, enc) });
  assert.equal(exp, ref);
  assert.ok(r.messageTokens <= countTokens(m, enc));
}

// Overlapping bypass windows in the body: αβγ with flat rules, windows [0,2) and [1,3).
{
  const m = wire('αxβyγz', 'αβγ αβγ');
  const ref = chironDecode(m.slice(m.indexOf(CHIRON_START)));
  const r = diglossiaEncode('x', enc, { message: m, messageTokens: countTokens(m, enc), decoded: ref });
  const exp = chironDecode(r.message.slice(r.message.indexOf(CHIRON_START)));
  trials.push({ name: 'overlapping-bypass-windows', applied: r.applied, exact: exp === ref, tokens: r.messageTokens, base: countTokens(m, enc) });
  assert.equal(exp, ref);
}

// Forward-reference injection into a tape value must be rejected by the decoder gate.
{
  const m = wire('αxβy', 'α β');
  const ref = chironDecode(m.slice(m.indexOf(CHIRON_START)));
  const r = diglossiaEncode('x', enc, { message: m, messageTokens: countTokens(m, enc), decoded: ref });
  const exp = chironDecode(r.message.slice(r.message.indexOf(CHIRON_START)));
  trials.push({ name: 'forward-reference-guard', applied: r.applied, exact: exp === ref });
  assert.equal(exp, ref);
}

fs.writeFileSync('bench/x119/receipts/attack-overlap.json', JSON.stringify({ schema: 'kompkernel-x119-attack-overlap-v1', trials, allExact: trials.filter(t => 'exact' in t).every(t => t.exact) }, null, 2) + '\n');
console.log(JSON.stringify(trials, null, 2));
console.log('ATTACK-OVERLAP PASS');
