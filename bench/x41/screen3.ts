// X41 screen 3 — how much does the instruction cost?
//
// The template transform is only worth shipping if the saving exceeds the
// clause. Both sides are measured against the real contract, in the position
// the clause will actually occupy (in front of "print only."), because EUTELEIA
// established that a clause priced as a standalone sentence is priced wrongly.
import { encode } from 'gpt-tokenizer';
const tok = (s: string) => encode(s).length;

const BASE = 'Before ¶ k=v. expand repeatedly; ';
const TAIL = 'print only.';
const baseTok = tok(BASE + TAIL);
console.log('bare contract tokens =', baseTok, '\n');

const cost = (clause: string) => tok(BASE + clause + ' ' + TAIL) - baseTok;

// A template is rendered as "####-##-##": '#' marks a digit place.
// each run of digits in a shape string is a COUNT of digit places, not the digits
const render = (shape: string) => shape.replace(/\p{N}+/gu, (m) => '#'.repeat(Number(m)));

// shape -> digit count
const dig = (shape: string) => (shape.match(/\p{N}+/gu) ?? []).reduce((a, m) => a + Number(m), 0);

const cases: Array<{ name: string; shapes: string[]; clause: (s: string[]) => string }> = [
  { name: 'A shape-list, hash notation', shapes: [], clause: (s) =>
      `Punctuation is stripped from these number shapes: ${s.map(render).join(' ')}. Restore it.` },
  { name: 'B shape-list + digit count', shapes: [], clause: (s) =>
      `Restore the stripped punctuation: ${s.map((x) => dig(x) + ' digits = ' + render(x)).join('; ')}.` },
  { name: 'C worked example per shape', shapes: [], clause: (s) =>
      `Numbers have had separators removed; restore them, e.g. ${s.map((x) => ex(x)).join('; ')}.` },
  { name: 'D terse: counts + shape', shapes: [], clause: (s) =>
      `Restore separators: ${s.map((x) => dig(x) + ':' + render(x)).join(', ')}.` },
  { name: 'E no notation, prose only', shapes: [], clause: (s) =>
      `Separators are removed from numbers and must be restored by position: ` +
      `${s.map((x) => dig(x) + ' digits split as ' + x.replace(/\p{N}+/gu, 'n').split('').join(' ')).join('; ')}.` },
];

// concrete before/after example for a shape
function ex(shape: string): string {
  const digits = '123456789012345678901234567890';
  let i = 0, out = '';
  for (const m of shape.match(/\p{N}+|[^\p{N}]/gu) ?? []) {
    if (/\p{N}/u.test(m[0])) out += digits.slice(i, i + Number(m)), i += Number(m);
    else out += m;
  }
  const stripped = out.replace(/[^\p{N}]/gu, '');
  return `${stripped} back to ${out}`;
}

const sets: Array<[string, string[]]> = [
  ['1 shape  (4-2-2)',        ['4-2-2']],
  ['2 shapes (4-2-2, 2.6)',   ['4-2-2', '2.6']],
  ['2 shapes (4-2-2, 2.8)',   ['4-2-2', '2.8']],
  ['3 shapes',                ['4-2-2', '2.6', '2:2:2.3']],
];

process.stdout.write('wording'.padEnd(30));
for (const [n] of sets) process.stdout.write(n.padStart(24));
console.log();
for (const c of cases) {
  process.stdout.write(c.name.padEnd(30));
  for (const [, sh] of sets) process.stdout.write(String(cost(c.clause(sh))).padStart(24));
  console.log();
}
console.log('\n--- literal clause text for the 2-shape case, wording C ---');
console.log(cases[2].clause(['4-2-2', '2.6']));
console.log('--- and wording A ---');
console.log(cases[0].clause(['4-2-2', '2.6']));
