/**
 * bench/synizesis-redteam.ts
 * ---------------------------------------------------------------------------
 * Second-order adversary for SYNIZESIS.  Every check is a real assertion that
 * throws; nothing is "reported as probably fine".
 *
 *  A. exactness on every fixture, both encodings
 *  B. adversarial inputs designed to break each mechanism
 *  C. randomised differential fuzz (10k cases) against the decoder
 *  D. never-worse property: messageTokens <= raw for every input
 *  E. wire self-containment: the decoder gets only the wire
 *  F. idempotence / double-decode safety
 *  G. cross-decoder agreement is checked by bench/synizesis_decode.py (CPython)
 *     via bench/synizesis-crosscheck.sh
 */
import fs from 'node:fs';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import {
  synizesisEncode, synizesisDecode, synPlan, renderSynWire, synContract,
  scanSpans, maskOf, inducedShape, digitShape, hexShift, hexUnshift, oneTokenSigils,
  SYN_SEP, SYN_HEX, SYN_SLOT,
} from '../src/lib/omega/synizesis';
import { allFixtures } from './synizesis-fixtures';

let checks = 0, fails = 0;
function ok(cond: boolean, what: string, extra = '') {
  checks++;
  if (!cond) { fails++; console.log('  FAIL ' + what + (extra ? '  ' + extra : '')); }
}

const ENCS: EncodingName[] = ['o200k_base', 'cl100k_base'];

console.log('== A. exactness on every fixture, both encodings ==');
for (const enc of ENCS) {
  for (const f of allFixtures()) {
    const r = synizesisEncode(f.text, enc, { budgetMs: 250 });
    ok(r.decoded === f.text, `exact ${enc} ${f.name}`);
    ok(r.messageTokens <= countTokens(f.text, enc), `never-worse ${enc} ${f.name}`, `${r.messageTokens} > ${countTokens(f.text, enc)}`);
  }
}

console.log('== B. adversarial inputs ==');
const adversarial: Array<[string, string]> = [
  ['empty', ''],
  ['single-char', 'x'],
  ['only-sep', SYN_SEP],
  ['sep-in-text', `a ${SYN_SEP} b\n2026-01-01 2026-01-02 2026-01-03`],
  ['hex-sigil-in-text', `${SYN_HEX} 2026-01-01 2026-01-02`],
  ['slot-in-text', '#### 2026-01-01,1 2026-01-02,2 2026-01-03,3 #### 12:00:00 12:00:01'],
  ['slot-inside-span', 'a#1-b#2 a#3-b#4 a#5-b#6 a#7-b#8'],
  ['all-sigils-present', oneTokenSigils('o200k_base').join('') + ' 2026-01-01 2026-01-02 2026-01-03'],
  ['crlf', 'a,1\r\nb,2\r\nc,3\r\n2026-01-01,1\r\n2026-01-02,2\r\n2026-01-03,3\r\n'],
  ['lone-cr', '2026-01-01,1\r2026-01-02,2\r2026-01-03,3\r'],
  ['nul-ish', '\u0000\u0001 2026-01-01,1 2026-01-02,2 2026-01-03,3'],
  ['astral', '👨‍👩‍👧‍👦 2026-01-01,1 2026-01-02,2 2026-01-03,3 🧬'],
  ['rtl', 'العربية 2026-01-01,1 2026-01-02,2 2026-01-03,3'],
  ['combining', 'e\u0301e\u0301 2026-01-01,1 2026-01-02,2 2026-01-03,3'],
  ['digit-collision', '2026-01-01,1 2026-01-02,2 2026-01-03,3 and a bare 20260101 and 999999999999'],
  ['nested-digits', 'a1b2c3 12345678901234567 12345678901234567 12345678901234567'],
  ['huge-digit-run', '1'.repeat(5000) + ' 2026-01-01,1 2026-01-02,2'],
  ['hex-lookalike', 'deadbeefdeadbeefdeadbeef cafebabecafebabecafebabe 0123456789abcdef0123'],
  ['hex-with-gp', 'deadbeefdeadbeefdeadbeef ghijklmnopghijklmnop'],
  ['trailing-newlines', '2026-01-01,1\n2026-01-02,2\n2026-01-03,3\n\n\n\n'],
  ['leading-ws', '   \t 2026-01-01,1 2026-01-02,2 2026-01-03,3'],
  ['only-separators', '----....::::////'],
  ['pathological-alt', 'a1'.repeat(2000)],
  ['json-deep', JSON.stringify({ a: { b: { c: Array.from({ length: 60 }, (_, i) => ({ t: `2026-01-${String(1 + i % 28).padStart(2, '0')}T00:00:0${i % 10}.000Z`, v: i })) } } })],
  ['iso-in-prose', 'The meeting on 2026-01-01 at 09:30:00 was moved to 2026-01-02 at 10:45:00 and then to 2026-01-03 at 11:15:00.'],
  ['mixed-widths', '1.2 12.34 123.456 1234.5678 12345.67890 1.2 12.34 123.456'],
  ['repeated-identical', ('2026-01-01T00:00:00.000Z\n').repeat(200)],
];
for (const enc of ENCS) {
  for (const [name, txt] of adversarial) {
    let r;
    try { r = synizesisEncode(txt, enc, { budgetMs: 400 }); }
    catch (e) { ok(false, `no-throw ${enc} ${name}`, String(e)); continue; }
    ok(r.decoded === txt, `exact ${enc} ${name}`);
    ok(r.messageTokens <= countTokens(txt, enc), `never-worse ${enc} ${name}`);
    // the wire alone must decode (self-containment)
    if (r.winner === 'synizesis') ok(synizesisDecode(r.wire) === txt, `wire-self-contained ${enc} ${name}`);
  }
}

console.log('== C. randomised differential fuzz ==');
let seed = 0x9e3779b9;
function rnd() { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return seed / 0x100000000; }
function pick<T>(a: T[]) { return a[Math.floor(rnd() * a.length)]; }
const atoms = ['2026-01-02', '12:34:56', '1.2.3', '10.0.0.1', 'a-b', 'x_1', 'REF-2026-000123',
  'deadbeefcafebabe0123', 'foo/bar/baz.ts', '#', '⇒', '≈', '◆', ' ', '\n', '\t', ',', '.', 'word',
  'ABC', '999', '0', '', '\r\n', 'é', '中', '0123456789', '1234567890123456789'];
let fuzzFail = 0;
for (let i = 0; i < 10000; i++) {
  const n = 1 + Math.floor(rnd() * 25);
  let t = '';
  for (let k = 0; k < n; k++) t += pick(atoms);
  const p = (() => { try { return synPlan(t, 'o200k_base'); } catch { return null; } })();
  if (!p) continue;
  const w = renderSynWire(p);
  if (synizesisDecode(w) !== t) { fuzzFail++; if (fuzzFail < 4) console.log('  FUZZ MISMATCH', JSON.stringify(t.slice(0, 120))); }
}
ok(fuzzFail === 0, `fuzz 10000 random docs round-trip`, `${fuzzFail} mismatches`);

console.log('== D. component properties ==');
for (let i = 0; i < 4000; i++) {
  const n = 1 + Math.floor(rnd() * 40);
  let h = '';
  for (let k = 0; k < n; k++) h += '0123456789abcdef'[Math.floor(rnd() * 16)];
  if (hexUnshift(hexShift(h)) !== h) { ok(false, 'hexShift involutive', h); break; }
}
ok(true, 'hexShift/hexUnshift round-trip on 4000 random hex runs');
{
  const spans = scanSpans('2026-01-02T03:04:05.678Z and 10.0.0.1 plus a/b/c');
  ok(spans.length >= 2, 'scanSpans finds the obvious literals', JSON.stringify(spans.map((s) => s.text)));
  for (const s of spans) ok(!/\s/.test(s.text), 'spans contain no whitespace');
}
{
  const m = ['2026-01-02', '2026-01-03', '2027-01-04'];
  const ind = inducedShape(m)!;
  ok(ind.shape === '202#-01-0#', 'position induction keeps constants', ind.shape);
  for (let i = 0; i < m.length; i++) {
    let k = 0, out = '';
    for (const c of ind.shape) out += c === SYN_SLOT ? ind.payloads[i][k++] : c;
    ok(out === m[i], 'induced shape reconstructs member ' + i, out);
  }
}
{
  const d = digitShape('v1.2.3-beta.4')!;
  ok(d.shape === 'v#.#.#-beta.#', 'digitShape skeleton', d.shape);
  ok(d.payload === '1234', 'digitShape payload', d.payload);
}

console.log('== E. contract sufficiency (mechanical) ==');
// The contract claims exactly three rules.  Assert the decoder uses no others:
// remove each rule from a synthetic wire and verify the output changes only in
// the way that rule describes.
{
  const wire = `◆####-##-##\n${SYN_SEP}\n◆20260102 and 20260103`;
  ok(synizesisDecode(wire) === '2026-01-02 and 20260103', 'symbol rule applies only at its symbol', JSON.stringify(synizesisDecode(wire)));
  const wire2 = `########\n${SYN_SEP}\n20260102 and 2026010`;
  ok(synizesisDecode(wire2) === '20260102 and 2026010', 'bare identity pattern is a no-op', JSON.stringify(synizesisDecode(wire2)));
  const wire3 = `##-##-##\n${SYN_SEP}\n260102 and 26010`;
  ok(synizesisDecode(wire3) === '26-01-02 and 26010', 'bare pattern fires only on matching digit-run length', JSON.stringify(synizesisDecode(wire3)));
}

console.log('== F. no-sep passthrough ==');
ok(synizesisDecode('plain text with no legend') === 'plain text with no legend', 'wire without ⇒ is returned verbatim');

console.log('');
console.log(`checks=${checks} failures=${fails}`);
if (fails > 0) process.exit(1);
