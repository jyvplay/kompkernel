// X16 red team for HOMOIOS. Every case: homoiosEncode(x) -> wire, then the arm-aware reader must return x.
// Also checks that the encoder never returns a wire whose library read differs from the input.
import { homoiosEncode, homoiosRead, homoiosDiff, homoiosApply } from '@/lib/omega/homoios';

let pass = 0, fail = 0;
const fails: string[] = [];
function check(name: string, x: string) {
  let ok = true, detail = '';
  try {
    const r = homoiosEncode(x, 'o200k_base');
    const back = homoiosRead(r);   // arm-aware: identity arm is plain DAEDALUS-D, no block rule
    ok = back === x;
    detail = `arm=${r.arm} subs=${r.subs} M=${r.messageTokens}`;
    if (r.arm === 'edits' && !ok) detail += ' EDITS-ARM-MISMATCH';
  } catch (e: any) { ok = false; detail = 'threw: ' + String(e?.message ?? e).slice(0, 120); }
  if (ok) pass++; else { fail++; fails.push(`${name}: ${detail}`); }
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`);
}

const P = (n: number, s: string) => Array.from({ length: n }, (_, i) => s.replace('#', String(i + 1))).join('\n\n');
const tmpl = 'The job started at 02:00 and stopped at 06:00 after the four-hour cap. It considered 12000 documents and disposed 800. 11200 documents remained in the queue.';
const variant = (k: number) => tmpl.replace('12000', String(12000 + 731 * k)).replace('800.', `${800 + 43 * k}.`).replace('11200', String(11200 + 688 * k));

check('empty', '');
check('whitespace only', '   \n\n  \n');
check('single block', 'just one paragraph of text here with some words in it.');
check('two identical blocks', tmpl + '\n\n' + tmpl);
check('eight near-duplicate blocks', Array.from({ length: 8 }, (_, k) => variant(k)).join('\n\n'));
check('trailing newline', variant(0) + '\n\n' + variant(1) + '\n');
check('leading blank lines', '\n\n' + variant(0) + '\n\n' + variant(1));
check('many blank lines between blocks', variant(0) + '\n\n\n\n\n' + variant(1) + '\n \n' + variant(2));
check('CRLF line endings', (variant(0) + '\r\n\r\n' + variant(1)).replace(/\n/g, '\r\n'));
check('block that looks like a wire block', '[1]\n\n' + variant(0));
check('block [2|a=b]', variant(0) + '\n\n[2|a=b]');
check('input with = and | in text', 'x = y | z\n\n' + 'x = y | w\n\n' + 'x = y | z');
check('input with ] and [', '[note] see [1]\n\n[note] see [2]\n\n[note] see [3]');
check('insert at start of block', 'alpha beta gamma delta epsilon zeta eta theta.\n\nZ alpha beta gamma delta epsilon zeta eta theta.');
check('insert at end of block', 'alpha beta gamma delta epsilon zeta eta theta.\n\nalpha beta gamma delta epsilon zeta eta theta. Z');
check('delete a middle word', 'one two three four five six seven eight nine ten eleven.\n\none two three four five six eight nine ten eleven.');
check('replace first and last word', 'red green blue red green blue red green blue.\n\nred green blue red green blue red green blue? ok.');
check('repeated words, ambiguous anchors', 'a b a b a b a b a b a b a b.\n\na b a b a X a b a b a b a b.');
check('unicode blocks', '日本語のテキストです。これはテストです。\n\n日本語のテキストです。これは試験です。 emoji 🙂');
check('long repetitive block', Array.from({ length: 300 }, (_, k) => `item ${k} value ${k * 7}`).join(' ') + '\n\n' + Array.from({ length: 300 }, (_, k) => `item ${k} value ${k * 7 + (k % 50 === 0 ? 1 : 0)}`).join(' '));
check('whitespace-only edit', 'a  b   c d e f g h i j k l.\n\na b c d e f g h i j k l.');
check('blocks that are only numbers', '12\n\n12\n\n13\n\n12');
check('tabs and columns', 'a\t1\tb\t2\tc\t3\n\na\t1\tb\t9\tc\t3\n\na\t1\tb\t9\tc\t4');
check('code block with blank lines', '```ts\nconst a = 1;\n\nconst b = 2;\n```\n\n```ts\nconst a = 1;\n\nconst b = 3;\n```');
check('marker-like unicode elsewhere', '⟪ not a marker ⟫ in text\n\n' + variant(0));

// Fuzz: seeded random documents with block repetition and random word edits. Exactness is required on all.
let seed = 20261015;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
const words = ['alpha', 'beta', 'gamma', 'delta', 'to', 'the', 'of', '=', '|', '[7]', '12', '3.5', 'x', 'é', 'ok.', '\t', 'a=b', ']'];
function block(len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += words[Math.floor(rnd() * words.length)] + (rnd() < 0.15 ? '\n' : ' ');
  return s.trimEnd();
}
let fuzzN = 0;
for (let t = 0; t < 120; t++) {
  const nb = 2 + Math.floor(rnd() * 6);
  const base = block(20 + Math.floor(rnd() * 40));
  const blocks: string[] = [];
  for (let k = 0; k < nb; k++) {
    if (k === 0 || rnd() < 0.3) blocks.push(block(10 + Math.floor(rnd() * 50)));
    else {
      // edit an earlier block: replace, insert, or delete a few words
      const w = blocks[Math.floor(rnd() * blocks.length)].split(' ');
      const e = 1 + Math.floor(rnd() * 3);
      for (let j = 0; j < e; j++) {
        const at = Math.floor(rnd() * w.length);
        const op = rnd();
        if (op < 0.4) w[at] = words[Math.floor(rnd() * words.length)];
        else if (op < 0.7) w.splice(at, 0, words[Math.floor(rnd() * words.length)]);
        else if (w.length > 3) w.splice(at, 1);
      }
      blocks.push(w.join(' '));
    }
  }
  const doc = [base, ...blocks].join(rnd() < 0.5 ? '\n\n' : '\n\n\n');
  fuzzN++;
  check(`fuzz ${t}`, doc);
}

// Diff-level property: homoiosApply(ref, homoiosDiff(ref, t)) === t whenever the diff is non-null.
let dOk = 0, dNull = 0, dBad = 0;
for (let t = 0; t < 200; t++) {
  const a = block(15 + Math.floor(rnd() * 30));
  const w = a.split(' ');
  for (let j = 0; j < 1 + Math.floor(rnd() * 4); j++) {
    const at = Math.floor(rnd() * (w.length + 1));
    const op = rnd();
    if (op < 0.4) w[Math.min(at, w.length - 1)] = words[Math.floor(rnd() * words.length)];
    else if (op < 0.8) w.splice(at, 0, words[Math.floor(rnd() * words.length)]);
    else if (w.length > 3) w.splice(Math.min(at, w.length - 1), 1);
  }
  const b = w.join(' ');
  const ed = homoiosDiff(a, b);
  if (ed === null) { dNull++; continue; }
  if (homoiosApply(a, ed) === b) dOk++; else dBad++;
}
console.log(`diff property: exact=${dOk} null=${dNull} BAD=${dBad}`);
if (dBad > 0) fail++;
console.log(`\nRED TEAM: ${pass} pass, ${fail} fail (of ${pass + fail}; fuzz docs ${fuzzN})`);
for (const f of fails) console.log('  ' + f);
process.exit(fail === 0 ? 0 : 1);
