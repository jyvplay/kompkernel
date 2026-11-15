/** X119 ΔΙΓΛΩΣΣΙΑ unit probes. Synthetic wires; no corpus timing claim. */
import assert from 'node:assert/strict';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from '../../src/lib/omega/chiron';
import { diglossiaEncode, diglossiaDisabled } from '../../src/lib/omega/diglossia';
Object.assign(process.env, { OMEGA_DET: '1' });
delete process.env.OMEGA_NO_DIGLOSSIA; delete process.env.OMEGA_DIGLOSSIA;
const enc = 'o200k_base' as const;
let passed = 0;
function ok(name: string, fn: () => void) { fn(); passed++; console.log(`PASS ${name}`); }
const T = (s: string) => countTokens(s, enc);
const wire = (tape: string, body: string, contract = '¶k=v expand repeatedly print only.\n') => contract + CHIRON_START + tape + CHIRON_SEP + body;
const inc = (m: string) => ({ message: m, messageTokens: T(m), decoded: chironDecode(m.slice(m.indexOf(CHIRON_START))) });

ok('disabled switch refuses without touching the wire', () => {
  process.env.OMEGA_NO_DIGLOSSIA = '1';
  assert.equal(diglossiaDisabled(), true);
  const m = wire('αabc', 'abc abc abc');
  const r = diglossiaEncode('x', enc, inc(m));
  assert.equal(r.applied, false); assert.equal(r.message, m);
  delete process.env.OMEGA_NO_DIGLOSSIA;
});

ok('no CHIRON frame is a refusal, not a crash', () => {
  const r = diglossiaEncode('plain prose', enc, { message: 'plain prose', messageTokens: T('plain prose'), decoded: 'plain prose' });
  assert.equal(r.applied, false);
});

ok('adoption keeps the contract and the CHIRON expansion byte-exact', () => {
  // A long flat value that is cheaper as a glyph at these boundaries.
  const v = 'internationalization';
  const m = wire('α' + v, v + ' ' + v + ' α');
  const before = chironDecode(m.slice(m.indexOf(CHIRON_START)));
  const r = diglossiaEncode('x', enc, inc(m));
  assert.equal(r.applied, true);
  assert.ok(r.messageTokens < T(m));
  assert.equal(chironDecode(r.message.slice(r.message.indexOf(CHIRON_START))), before);
  assert.ok(r.message.startsWith('¶k=v expand repeatedly print only.\n' + CHIRON_START));
  assert.ok(r.adopt >= 1);
});

ok('bypass can inline a reference window when the literal merges cheaper', () => {
  // Two short rules whose glyphs are expensive at ASCII boundaries.
  const m = wire('αxβy', 'αβ αβ αβ');
  const before = chironDecode(m.slice(m.indexOf(CHIRON_START)));
  const r = diglossiaEncode('x', enc, inc(m));
  assert.equal(r.applied, true);
  assert.ok(r.messageTokens < T(m));
  assert.equal(chironDecode(r.message.slice(r.message.indexOf(CHIRON_START))), before);
  assert.ok(r.bypass >= 1);
});

ok('a forward reference introduced into a tape value is rejected', () => {
  // α's value mentions β, but β is declared AFTER α: malformed incumbent.
  const m = wire('αβxβy', 'α');
  const r = diglossiaEncode('x', enc, inc(m));
  assert.equal(r.applied, false);
});

ok('overlapping sites are never both applied', () => {
  const v = 'abab';
  const m = wire('α' + v, v + v + ' α');
  const before = chironDecode(m.slice(m.indexOf(CHIRON_START)));
  const r = diglossiaEncode('x', enc, inc(m));
  if (r.applied) {
    assert.equal(chironDecode(r.message.slice(r.message.indexOf(CHIRON_START))), before);
    assert.ok(r.messageTokens < T(m));
  }
});

ok('the pass is monotone and idempotent at its own fixed point', () => {
  const v = 'internationalization';
  const m = wire('α' + v, v + ' ' + v + ' α');
  const r1 = diglossiaEncode('x', enc, inc(m));
  assert.equal(r1.applied, true);
  const r2 = diglossiaEncode('x', enc, inc(r1.message));
  assert.ok(r2.messageTokens <= r1.messageTokens);
  assert.equal(chironDecode(r2.message.slice(r2.message.indexOf(CHIRON_START))),
             chironDecode(r1.message.slice(r1.message.indexOf(CHIRON_START))));
  if (r2.applied) assert.ok(r2.messageTokens < r1.messageTokens);
});

ok('nested (non-flat) rules are not used as bypass literals', () => {
  const m = wire('αxβαy', 'α β αβ');
  const before = chironDecode(m.slice(m.indexOf(CHIRON_START)));
  const r = diglossiaEncode('x', enc, inc(m));
  if (r.applied) assert.equal(chironDecode(r.message.slice(r.message.indexOf(CHIRON_START))), before);
});

console.log(`\nDIGLOSSIA unit ${passed}/${passed} PASS`);
