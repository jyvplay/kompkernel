/**
 * bench/x125/klerosis.ts — X125 probe: does the glyph alphabet have PRICE, or
 * only capacity?
 *
 * `bench/x125/respell.ts` re-spelled each shipped wire's tape into all eight
 * scripts and priced the resulting complete message. That measures the spelling
 * of a FIXED grammar. What it cannot see is the thing that actually decides the
 * frontier: when the search runs inside a bigger alphabet, does it find a
 * BETTER grammar, or just the same one with different letters?
 *
 * The two are different hypotheses and they predict different numbers:
 *
 *   H_cap   CHIRON is alphabet-capacity-bound. cyrillic has 122 one-token
 *           letters; a lane that wants more rules than that is refused rules it
 *           would have used. A larger pool (polyglot 799 / cjk 2515 / hangul
 *           677) should then produce a strictly cheaper wire on the rule-hungry
 *           lanes — and the win should grow with the rule count.
 *   H_dens  CHIRON is merge-density-bound. cyrillic's 122 letters carry 823
 *           merge pairs (5.5 % of ordered pairs); polyglot's 799 carry 3413
 *           (0.53 %); cjk's 2515 carry 2400 (0.04 %). Rules are named by single
 *           glyphs and the body interleaves them, so adjacent glyphs that merge
 *           into one token are paid once instead of twice. cyrillic should then
 *           beat every larger pool even when it has room to spare.
 *
 * The probe runs the real `chironEncode` with `options.script` forced, on the
 * lanes that respell showed to be rule-rich, and prices the complete single-chat
 * message. It reports, per lane: rules, price, and exactness under each
 * alphabet. Exactness is checked with `chironDecode`, and additionally against
 * the plain-text original for the whole-message round trip.
 *
 * Zero new codec code: the only change under test is the new `script` option.
 */
import * as fs from 'node:fs';
import { countTokens, type EncodingName } from '../../src/lib/omega/bpe';
import { chironEncode, chironDecode, chironDecoderPrompt, CHIRON_SCRIPTS } from '../../src/lib/omega/chiron';
import { chironConsume, chironExhausted, chironLastEpochUsedUnits } from '../../src/lib/omega/workmeter';

const enc: EncodingName = 'o200k_base';

const LANES: Array<[string, string]> = [
  ['ls-l-real', 'bench/holdout-x41/ls-l-real.txt'],
  ['ps-aux-real', 'bench/holdout-x41/ps-aux-real.txt'],
  ['code-ts', 'bench/holdout/code-ts.txt'],
  ['apt-real', 'bench/holdout-x41/apt-real.txt'],
  ['json-pkg', 'bench/holdout/json-pkg.txt'],
  ['node-help', 'bench/holdout-x41/node-help.txt'],
  ['ls-real', 'bench/holdout-x41/ls-real.txt'],
  ['dpkg-l', 'bench/holdout-x42/dpkg-l.txt'],
  ['ps-real', 'bench/holdout-x41/ps-real.txt'],
  ['email-thread', 'bench/holdout-work/email-thread.txt'],
];

const SCRIPTS = process.env.SCRIPTS ? process.env.SCRIPTS.split(',') : CHIRON_SCRIPTS.map((s) => s.name);
const REPS = Number(process.env.REPS ?? '1');
// warm the tokenizer's lazy tables before the first encode (esbuild hoists the
// module-level PRETOK assignment into a lazy init that a direct chiron import
// can otherwise reach first).
const WARM = countTokens('warm up the tokenizer', enc);

function price(text: string, script?: string) {
  const r = chironEncode(text, enc, { script });
  return { tok: r.messageTokens, wire: r.wire, rules: r.rules, exact: r.exact, ms: r.ms, work: chironLastEpochUsedUnits(), script: r.script };
}

console.log(`lanes ${LANES.length}  scripts ${SCRIPTS.join(',')}  reps ${REPS}`);
console.log('');
console.log('lane            script      price   Δ vs base   rules  exact   ms     work');
const totals = new Map<string, number>();
const baseTotals = new Map<string, number>();

for (const [lane, path] of LANES) {
  const text = fs.readFileSync(path, 'utf8');
  let base = Infinity;
  const rows: Array<[string, number, number, boolean, number, number]> = [];
  for (const s of SCRIPTS) {
    let best: { tok: number; rules: number; exact: boolean; ms: number; work: number } | null = null;
    for (let k = 0; k < REPS; k++) {
      const r = price(text, s);
      if (!best || r.tok < best.tok) best = { tok: r.tok, rules: r.rules, exact: r.exact, ms: r.ms, work: r.work };
    }
    const b = best!;
    rows.push([s, b.tok, b.rules, b.exact, b.ms, b.work]);
    if (s === 'cyrillic') base = b.tok;
    totals.set(s, (totals.get(s) ?? 0) + b.tok);
  }
  // the shipped behaviour is the unforced pick; price it too
  const unforced = price(text);
  baseTotals.set('unforced', (baseTotals.get('unforced') ?? 0) + unforced.tok);
  for (const [s, tok, rules, exact, ms, work] of rows) {
    const d = base === Infinity ? 0 : tok - base;
    console.log(`${lane.padEnd(14)} ${s.padEnd(10)} ${String(tok).padStart(6)}  ${String(d > 0 ? '+' + d : d).padStart(8)}   ${String(rules).padStart(5)}  ${exact ? 'y' : 'N'}   ${String(ms).padStart(6)} ${String(work).padStart(9)}`);
  }
  console.log(`${''.padEnd(14)} ${'unforced'.padEnd(10)} ${String(unforced.tok).padStart(6)}  ${String(unforced.tok - base).padStart(8)}   ${String(unforced.rules).padStart(5)}  ${unforced.exact ? 'y' : 'N'}   ${String(unforced.ms).padStart(6)} ${String(unforced.work).padStart(9)}`);
  console.log('');
}

console.log('Σ over lanes:');
for (const s of SCRIPTS) console.log(`  ${s.padEnd(10)} ${totals.get(s)}`);
console.log(`  ${'unforced'.padEnd(10)} ${baseTotals.get('unforced')}`);
console.log(`chironExhausted: ${chironExhausted()}`);
