/** X120: the last-chunk identity against the unaccelerated tokenizer, then two
 *  whole lanes through the shipped chain. This is the load-bearing algebra of
 *  the chunk-state DP; it found the whitespace counterexample that corrected it. */
import * as fs from 'node:fs';
import { tagstackEncode, tagstackMemoClear } from '../../src/lib/omega/tagstack';
import { synedriaReset } from '../../src/lib/omega/synedria';
import { countTokens, countTokensExact, tokenTail, tailMemoStats } from '../../src/lib/omega/bpe';
Object.assign(process.env, { OMEGA_DET: '1', OMEGA_NO_MEMO: '1', OMEGA_ENGRAM: '0', OMEGA_OURA_MEMO: '0',
  OMEGA_NO_OROTHESIA: '1', OMEGA_SYNEDRIA: '1', OMEGA_SYNEDRIA_CHAIN: '1', OMEGA_ENALLAGE: '1',
  OMEGA_MEKOS: '1', OMEGA_SYNTHESIS: '1', OMEGA_COUNT_PREFIX: '0' });
/* LAST-CHUNK THEOREM: tokens(s+p) = tokens(s) - tokens(last(s)) + tokens(last(s)+p).
 * This is the load-bearing identity of the X120 chunk-state DP. Checked against
 * the unaccelerated tokenizer on adversarial whitespace, punctuation, digit and
 * case boundaries, not on prose alone. */
const atoms = ['a', 'Z', '9', ' ', '!', '/', '\t', '\n', '\r', 'é', 'Ω', '中', "'s", '  ', '\r\n', 'Ab', '12', '...'];
let tailCases = 0, tailBad = 0, tailNull = 0;
for (const a of atoms) for (const b of atoms) for (const c of atoms) {
  const s0 = (a + b).repeat(3) + c;
  for (const p of atoms) {
    const ti = tokenTail(s0, 'o200k_base');
    tailCases++;
    if (ti === null) { tailNull++; continue; }
    const lhs = countTokensExact(s0 + p, 'o200k_base');
    const rhs = countTokensExact(s0, 'o200k_base') - countTokensExact(ti.tail, 'o200k_base') + countTokensExact(ti.tail + p, 'o200k_base');
    if (lhs !== rhs) { tailBad++; if (tailBad < 4) console.log('TAIL MISMATCH', JSON.stringify({ s0, p, tail: ti.tail, lhs, rhs })); }
  }
}
console.log(`last-chunk theorem: ${tailCases - tailBad - tailNull}/${tailCases} exact, ${tailNull} uncovered, ${tailBad} MISMATCHES`);

const paths = process.argv.slice(2).length ? process.argv.slice(2) : ['bench/holdout-x42/findmnt.txt', 'bench/holdout-work/kb-article.txt'];
const rows: any[] = [];
// independent algebra check on adversarial boundary strings first
const cases: string[] = [];
for (const a of ['a', 'Z', '9', ' ', '!', '/', '\t']) for (const nl of ['\n', '\r', '\r\n', '\n\n', '  \n', '\n  ']) for (const b of ['b', 'Q', '7', ' ', '!', '/', '\t', 'é', 'Ω', '中']) {
  cases.push('word' + a + nl + b + 'tail more text here to be long enough');
}
let algBad = 0;
for (const s of cases) if (countTokens(s, 'o200k_base') !== countTokensExact(s, 'o200k_base')) algBad++;
console.log(`boundary algebra: ${cases.length - algBad}/${cases.length} exact`);

/* REUSE PAIRS: long strings that share a prefix and differ in the tail, so the
 * reuse path actually fires. Each second string is checked against the
 * unaccelerated tiktoken answer, not against the cache. */
const heads = [
  'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega. '.repeat(4),
  '  indented line with words and numbers 12345 and punctuation!!! '.repeat(6) + '\n',
  'Ünïcödé wörds Ωμέγα 中文字 mixed with ASCII 42. '.repeat(6),
  'no newline at all just one very long single line of prose that keeps going and going. '.repeat(5),
  'a\r\nb\r\nc\r\n'.repeat(40),
  'x\n\n\ny\n'.repeat(60),
];
const tails = ['\nnext line here', '\r\nnext', '\n  spaced', '\n\ttabbed', '!punct', ' plain', '\n9digits', '\nÜnïcödé', '\n中', '', '\n', 'Z'];
let pairs = 0, pairBad = 0;
for (const h of heads) {
  for (const t1 of tails) {
    const a = h + t1;
    countTokens(a, 'o200k_base');
    for (const t2 of tails) {
      const b = h + t2;
      pairs++;
      if (countTokens(b, 'o200k_base') !== countTokensExact(b, 'o200k_base')) { pairBad++; console.log('PAIR MISMATCH', JSON.stringify(b.slice(-40))); }
    }
  }
}
for (const path of paths) {
  tagstackMemoClear(); synedriaReset();
  const text = fs.readFileSync(path, 'utf8');
  const t = performance.now();
  const r = tagstackEncode(text, 'o200k_base');
  const ms = performance.now() - t;
  const st = tailMemoStats();
  rows.push({ path, tokens: r.messageTokens, exact: r.decoded === text, ms, ...st });
  console.log(`${path} M=${r.messageTokens} exact=${r.decoded === text} ms=${Math.round(ms)} tailMemo size=${st.size} hits=${st.hits} misses=${st.misses}`);
}
fs.writeFileSync('bench/x120/receipts/tail-algebra.json', JSON.stringify({ schema: 'kompkernel-x120-tail-algebra-v1', boundaryCases: cases.length, boundaryBad: algBad, tailCases, tailBad, tailNull, rows }, null, 2) + '\n');
