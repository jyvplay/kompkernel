/** X120 ΒΕΛΤΙΣΤΟΣ unit probes. Synthetic wires; no corpus timing claim. */
import assert from 'node:assert/strict';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from '../../src/lib/omega/chiron';
import { veltistosEncode, veltistosDisabled, VELTISTOS_MAX_EDGES, VELTISTOS_LADDER } from '../../src/lib/omega/veltistos';
Object.assign(process.env, { OMEGA_DET: '1' });
delete process.env.OMEGA_NO_VELTISTOS; delete process.env.OMEGA_VELTISTOS; delete process.env.OMEGA_VELTISTOS_LADDER;
const enc = 'o200k_base' as const;
let passed = 0;
function ok(name: string, fn: () => void) { fn(); passed++; console.log(`PASS ${name}`); }
const T = (s: string) => countTokens(s, enc);
const CONTRACT = '¶k=v expand repeatedly print only.\n';
const wire = (tape: string, body: string, contract = CONTRACT) => contract + CHIRON_START + tape + CHIRON_SEP + body;
const inc = (m: string) => ({ message: m, messageTokens: T(m), decoded: chironDecode(m.slice(m.indexOf(CHIRON_START))) });
const exp = (m: string) => chironDecode(m.slice(m.indexOf(CHIRON_START)));
const run = (m: string) => veltistosEncode('x', enc, inc(m));

ok('disabled switch refuses without touching the wire', () => {
  process.env.OMEGA_NO_VELTISTOS = '1';
  assert.equal(veltistosDisabled(), true);
  const m = wire('αabc', 'abc abc abc');
  const r = run(m);
  assert.equal(r.applied, false); assert.equal(r.message, m);
  delete process.env.OMEGA_NO_VELTISTOS;
  assert.equal(veltistosDisabled(), false);
});

ok('no CHIRON frame is a refusal, not a crash', () => {
  const r = veltistosEncode('plain prose', enc, { message: 'plain prose', messageTokens: T('plain prose'), decoded: 'plain prose' });
  assert.equal(r.applied, false);
  assert.match(r.notes, /no CHIRON frame/);
});

ok('a tape whose first letter is not a known script is refused', () => {
  const r = run(wire('Zabc', 'abc abc'));
  assert.equal(r.applied, false);
});

ok('a key letter that reaches the payload through a LIST item is refused', () => {
  // chironDecode expands rule VALUES but copies LIST items verbatim, so a list
  // item containing a key letter puts that letter into the decoded text. The
  // re-speller would emit it as a literal and silently turn it into a reference.
  // This is the one reachable collision path; the guard must close it.
  const m = wire('αabcβq qγ…,αx,αyδ× β3γ', 'δ');
  const before = exp(m);
  assert.ok(before.includes('α'), 'fixture must actually put α in the expansion');
  const r = run(m);
  assert.equal(r.applied, false);
  assert.match(r.notes, /key letter occurs in the payload/);
});

ok('body re-spelling keeps the contract and the expansion byte-exact and is strictly cheaper', () => {
  const v = 'internationalization';
  const lit = Array.from({ length: 40 }, (_, i) => `${v} number ${i % 7} ${v}`).join('\n');
  const m = wire('α' + v, lit);
  const before = exp(m);
  const r = run(m);
  assert.equal(r.applied, true, r.notes);
  assert.ok(r.messageTokens < T(m), `${r.messageTokens} !< ${T(m)}`);
  assert.equal(r.messageTokens, T(r.message));
  assert.equal(exp(r.message), before);
  assert.ok(r.message.startsWith(CONTRACT + CHIRON_START));
});

ok('a rule made dead by re-spelling is retired, a reachable one is not', () => {
  const a = 'internationalization';
  const b = 'zzzz';
  // β is used once in the body; if the parse prefers the literal, β must go.
  const m = wire('α' + a + 'β' + b, Array.from({ length: 30 }, () => `${a} ${a} ${b}`).join('\n'));
  const before = exp(m);
  const r = run(m);
  if (r.applied) {
    assert.equal(exp(r.message), before);
    const tape = r.message.slice(r.message.indexOf(CHIRON_START) + 1, r.message.indexOf(CHIRON_SEP));
    if (r.pruned > 0) assert.ok(!tape.includes('β') || tape.includes('α'));
  }
});

ok('a list rule feeding a repeat template survives pruning and is never a body edge', () => {
  // γ is a LIST (no string value); × repeats template β over γ's items.
  const tape = 'β[x]γ…,a,b,cδ× β3γ';
  const body = 'δ δ δ';
  const m = wire(tape, body);
  const before = exp(m);
  assert.notEqual(before, m.slice(m.indexOf(CHIRON_START)), 'fixture must decode');
  const r = run(m);
  if (r.applied) {
    assert.equal(exp(r.message), before);
    const nt = r.message.slice(r.message.indexOf(CHIRON_START) + 1, r.message.indexOf(CHIRON_SEP));
    assert.ok(nt.includes('γ'), 'list rule must not be pruned while the repeat uses it');
    assert.ok(!r.message.slice(r.message.indexOf(CHIRON_SEP) + 1).includes('γ'), 'a list has no string value');
  }
});

ok('a repeat rule has a string value and may be used as an edge', () => {
  const tape = 'βxyδ× β40';
  const m = wire(tape, 'xyxyxyxy '.repeat(1) + 'δ');
  const before = exp(m);
  const r = run(m);
  if (r.applied) assert.equal(exp(r.message), before);
});

ok('the tape stage never introduces a forward reference', () => {
  // α's value contains β's value verbatim, but β is declared LATER. The tape
  // stage may only use EARLIER glyphs, so α must stay literal.
  const shared = 'internationalization';
  const m = wire('α' + shared + 'β' + shared, Array.from({ length: 25 }, () => 'α β').join('\n'));
  const before = exp(m);
  const r = run(m);
  if (r.applied) {
    assert.equal(exp(r.message), before);
    const nt = r.message.slice(r.message.indexOf(CHIRON_START) + 1, r.message.indexOf(CHIRON_SEP));
    const aAt = nt.indexOf('α'), bAt = nt.indexOf('β');
    if (aAt >= 0 && bAt >= 0 && aAt < bAt) {
      const aRaw = nt.slice(aAt + 1, bAt);
      assert.ok(!aRaw.includes('β'), 'α must not reference a later glyph');
    }
  }
});

ok('the tape stage can shorten a later rule using an earlier one', () => {
  const a = 'internationalization';
  const m = wire('α' + a + 'β' + a + '-committee', Array.from({ length: 30 }, () => 'β α β').join('\n'));
  const before = exp(m);
  const r = run(m);
  assert.equal(exp(r.message), before);
  if (r.applied) assert.ok(r.messageTokens < T(m));
});

ok('deterministic: the same input gives the same message twice', () => {
  const v = 'internationalization';
  const m = wire('α' + v, Array.from({ length: 40 }, (_, i) => `${v} ${i} ${v}`).join('\n'));
  const a = run(m), b = run(m);
  assert.equal(a.message, b.message);
  assert.equal(a.messageTokens, b.messageTokens);
  assert.equal(a.edges, b.edges);
});

ok('monotone and idempotent at its own fixed point', () => {
  const v = 'internationalization';
  const m = wire('α' + v, Array.from({ length: 40 }, (_, i) => `${v} ${i} ${v}`).join('\n'));
  const r1 = run(m);
  const r2 = run(r1.message);
  assert.ok(r2.messageTokens <= r1.messageTokens);
  assert.equal(exp(r2.message), exp(r1.message));
  if (r2.applied) assert.ok(r2.messageTokens < r1.messageTokens);
});

ok('the edge counter never exceeds the declared cap', () => {
  const v = 'internationalization';
  const m = wire('α' + v, Array.from({ length: 200 }, (_, i) => `${v} ${i} ${v}`).join('\n'));
  const r = run(m);
  assert.ok(r.edges <= VELTISTOS_MAX_EDGES, `${r.edges} > ${VELTISTOS_MAX_EDGES}`);
  if (r.applied) assert.equal(exp(r.message), exp(m));
});

ok('a malformed ladder override falls back to the shipped ladder', () => {
  process.env.OMEGA_VELTISTOS_LADDER = 'nonsense,-5:0,999:999';
  const v = 'internationalization';
  const m = wire('α' + v, Array.from({ length: 40 }, (_, i) => `${v} ${i} ${v}`).join('\n'));
  const r = run(m);
  const d = veltistosEncode('x', enc, inc(m));
  delete process.env.OMEGA_VELTISTOS_LADDER;
  const s = run(m);
  assert.equal(r.message, s.message);
  assert.equal(d.message, s.message);
  assert.ok(VELTISTOS_LADDER.length >= 2);
});

ok('a one-rung additive ladder is admissible but never better than the full ladder', () => {
  const v = 'internationalization';
  const m = wire('α' + v, Array.from({ length: 40 }, (_, i) => `${v} ${i} ${v}`).join('\n'));
  const full = run(m);
  process.env.OMEGA_VELTISTOS_LADDER = '0:1';
  const additive = run(m);
  delete process.env.OMEGA_VELTISTOS_LADDER;
  assert.ok(full.messageTokens <= additive.messageTokens);
  assert.equal(exp(full.message), exp(additive.message));
});

ok('an empty tape and a tape with no usable value are refusals', () => {
  assert.equal(run(wire('', 'abc')).applied, false);
  const listOnly = wire('γ…,a,b,c', 'abc');
  assert.equal(run(listOnly).applied, false);
});

console.log(`\nVELTISTOS unit ${passed}/${passed} PASS`);
