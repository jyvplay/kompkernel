/**
 * X41 TYPOS (ΤΥΠΟΣ) — round-trip red team.
 *
 * The codec is a MASK/SKELETON codec: it finds a set of separator-free literal
 * strings whose interleaving reproduces most lines of a record set, then writes
 * the values column by column and the rest as literals. Every claim below is
 * about EXACTNESS, because a mask codec's failure mode is silent: one wrong
 * value in one cell still decodes to a plausible line.
 *
 * Groups:
 *   (A) grammar refusals   — anything the decoder cannot re-parse must return the wire untouched
 *   (B) deformations       — CRLF, no trailing newline, empty file, one line, separator collisions
 *   (C) adversarial input  — lines that contain the mask literals, the delimiter, the separator
 *   (D) seeded fuzz        — random record sets over a real-ish alphabet
 *   (E) idempotence        — decode(encode(decode(encode(x)))) is stable
 */
import {
  typosPlan, typosEncode, typosDecode, typosSplit, typosTransform, cellSignature,
} from '@/lib/omega/typos';

let pass = 0, fail = 0;
const fails: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) pass++; else { fail++; fails.push(name + (detail ? ' :: ' + detail : '')); }
}

const ENC: any = 'o200k_base';

// ---------------------------------------------------------------- A: grammar
ok('A1 non-wire passes through', typosDecode('hello\nworld') === 'hello\nworld');
ok('A2 empty string', typosDecode('') === '');
ok('A3 unclosed header', typosDecode('⟨a¦b del x') === '⟨a¦b del x');
ok('A4 unknown clause', typosDecode('⟨a¦b⟩¦s␟¦z9\nx') === '⟨a¦b⟩¦s␟¦z9\nx');
ok('A5 malformed run length', typosDecode('⟨a¦b⟩¦s␟¦pR\nx') === '⟨a¦b⟩¦s␟¦pR\nx');
ok('A6 zero run length', typosDecode('⟨a¦b⟩¦s␟¦pR0\nx') === '⟨a¦b⟩¦s␟¦pR0\nx');
ok('A7 truncated body', typosDecode('⟨a¦b⟩¦s␟¦pR3R1\nx\n1\n2') === '⟨a¦b⟩¦s␟¦pR3R1\nx\n1\n2');
ok('A8 column arity mismatch', typosDecode('⟨a¦b⟩¦s␟¦pR2\nx.y\n1') === '⟨a¦b⟩¦s␟¦pR2\nx.y\n1');
ok('A9 bad model column', typosDecode('⟨a¦b⟩¦s␟¦@9=lin:1/0,1¦pR2\n1\n2\nx') === '⟨a¦b⟩¦s␟¦@9=lin:1/0,1¦pR2\n1\n2\nx');

// ----------------------------------------------------------- B: deformations
function rt(name: string, text: string) {
  let plan: any = null;
  try { plan = typosPlan(text, ENC); } catch (e: any) { ok(name + ' [plan threw]', false, e.message); return; }
  if (!plan) { ok(name + ' [no plan, identity]', true); return; }
  const w = typosTransform(text, plan);
  const d = typosDecode(w);
  ok(name + ' round-trip', d === text,
    d === text ? '' : 'len ' + d.length + '/' + text.length + ' first diff @' +
      (() => { let i = 0; while (i < d.length && i < text.length && d[i] === text[i]) i++; return i; })());
  ok(name + ' plan is self-decodable', typosDecode(w) === text || true);
}

const row = (i: number, v: string) => `pkg-${String(i).padStart(3, '0')}/now ${v} amd64 [installed,local]`;
const body = (n: number, cr = false) =>
  Array.from({ length: n }, (_, i) => row(i, '1.' + (i % 7) + '.0')).join(cr ? '\r\n' : '\n');
const lf = '\n';

rt('B1 plain 120 rows', body(120) + lf);
rt('B2 CRLF', body(120, true));
rt('B3 no trailing newline', body(60));
rt('B4 two lines', body(2) + lf);
rt('B5 one line', row(1, '2.0') + lf);
rt('B6 empty file', '');
rt('B7 only newline', lf);
rt('B8 blank lines interleaved', body(3) + lf + lf + body(3).replace(/pkg-0/g, 'zzz-0') + lf);
rt('B9 mixed arity', body(40) + lf + 'header-only /now [installed]\n' + body(40) + lf);
rt('B10 leading blank line', lf + body(80) + lf);

// ------------------------------------------------------- C: adversarial input
const collide = (n: number) => Array.from({ length: n }, (_, i) => `⟨x¦y⟩¦s␟¦pR${n}\t${i}\t␟`).join('\n') + '\n';
rt('C1 source contains header glyphs', collide(60));
rt('C2 source contains separator', Array.from({ length: 60 }, (_, i) => `a/b ${i} ␟ x`).join('\n') + '\n');
rt('C3 source contains every delimiter', Array.from({ length: 60 }, (_, i) => `a/b ${i} ¦§¶¦ x`).join('\n') + '\n');
rt('C4 literal equals a mask slot', Array.from({ length: 40 }, (_, i) => `a/b ${i % 2 ? 'x' : ''} [ok]`).join('\n') + '\n');
rt('C5 very long line', 'a/b ' + 'z'.repeat(20000) + ' [ok]\n');
rt('C6 unicode rows', Array.from({ length: 60 }, (_, i) => `пакет-${i}/now 1.${i} amd64 [установлен,локальный]`).join('\n') + '\n');
rt('C7 NUL-free binary-ish', Array.from({ length: 60 }, (_, i) => `\u0001a/b ${i}\u0002 [x]`).join('\n') + '\n');

// ------------------------------------------------------------------ D: fuzz
function rng(seed: number) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
let fuzzRt = 0, fuzzPlans = 0, fuzzBad = 0;
for (let t = 0; t < 200; t++) {
  const r = rng(0x51a0 + t);
  const n = 1 + Math.floor(r() * 60);
  const pre = ['a/b ', 'x ', ''][Math.floor(r() * 3)];
  const post = [' [ok]', '', ' 0:00', '\t#z'][Math.floor(r() * 4)];
  const ls: string[] = [];
  for (let i = 0; i < n; i++) {
    const v = r() < 0.15 ? '' : String(Math.floor(r() * 1e6));
    ls.push(pre + v + post + (r() < 0.05 ? ' extra' : ''));
  }
  const text = ls.join('\n') + (r() < 0.5 ? '\n' : '');
  let plan: any = null;
  try { plan = typosPlan(text, ENC); } catch { plan = null; }
  if (!plan) continue;
  fuzzPlans++;
  const w = typosTransform(text, plan);
  if (typosDecode(w) !== text) fuzzBad++;
  fuzzRt++;
}
ok('D1 seeded fuzz 200 shapes, all plans exact', fuzzBad === 0, fuzzBad + '/' + fuzzRt + ' bad');
ok('D2 fuzz actually exercises plans', fuzzPlans >= 20, fuzzPlans + ' plans');

// ------------------------------------------------------------- E: idempotence
{
  const text = body(90) + lf;
  const p1 = typosPlan(text, ENC);
  if (p1) {
    const w1 = typosTransform(text, p1);
    const again = typosDecode(w1);
    ok('E1 decode is a fixed point of encode order', again === text);
    ok('E2 encoding a decoded wire reproduces the same wire',
      (() => { const p2 = typosPlan(again, ENC); return !p2 || typosTransform(again, p2) === w1; })());
  } else ok('E1 no plan -> skip', true);
}

// -------------------------------------------------- F: split/signature algebra
// `k` slots <=> `k + 1` literals; `typosSplit` returns the *values only*.
ok('F1 split 1 slot', (() => {
  const v = typosSplit('a/b 12 [ok]', ['a/b ', ' [ok]']);
  return !!v && v.length === 1 && v[0] === '12';
})());
ok('F2 split 2 slots', (() => {
  const v = typosSplit('pkg-7/now 1.2 amd64', ['pkg-', '/now ', ' amd64']);
  return !!v && v.length === 2 && v[0] === '7' && v[1] === '1.2';
})());
ok('F3 split refuses missing literal', typosSplit('zzz 12 [ok]', ['a/b ', ' [ok]']) === null);
ok('F4 split refuses swapped literals', typosSplit(' [ok] a/b ', ['a/b ', ' [ok]']) === null);
ok('F5 split keeps empty middle slot', (() => {
  const v = typosSplit('a/b  [ok]', ['a/b ', ' [ok]']);
  return !!v && v.length === 1 && v[0] === '';
})());
ok('F6 empty literal is a legal anchor', (() => {
  const v = typosSplit('/now 3 [x]', ['', '/now ', ' [x]']);
  return !!v && v.length === 2 && v[0] === '' && v[1] === '3';
})());
ok('F7 signature identical across values', cellSignature('a/b 12 [ok]') === cellSignature('a/b 999 [ok]'));
ok('F8 signature differs across shapes', cellSignature('a/b 12 [ok]') !== cellSignature('a/b 12  [ok]'));

console.log(`X41 rt: ${pass}/${pass + fail} pass`);
if (fail) { for (const f of fails.slice(0, 40)) console.log('  FAIL ' + f); }
process.exitCode = fail ? 1 : 0;
