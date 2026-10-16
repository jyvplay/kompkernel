// X15: DIAPHORA red team. Each case: substitute -> expand must equal the input (transform level), and the full
// encoder must return an exact result (arm diaphora or identity). Attacks target the reader's position rule:
// digit runs that change count between lines, leading zeros, negative and zero deltas, CRLF, empty lines,
// the marker in the input, marks next to '-' and '.', and a missing line above.
import { diaphoraSubstitute, diaphoraExpand, diaphoraEncode, diaphoraDecode } from '@/lib/omega/diaphora';

const cases: [string, string][] = [
  ['empty', ''],
  ['no-digits', 'hello world\nno numbers here'],
  ['short-only', '10 11 12\n10 12 13\n'],
  ['same-long', '1234567\n1234567\n1234567\n'],
  ['positive-delta', '1000000\n1000007\n1000019\n'],
  ['negative-delta', '9000000\n8999993\n8999900\n'],
  ['leading-zero-raw', '1000\n0999\n1001\n'],
  ['leading-zero-above', '0099999\n1234567\n1234568\n'],
  ['count-change', '1234567 9876543\n1234568\n1234569 9876550\n'],
  ['column-shift', '12345 67890 11111\n67891 12346 22222\n12347 67892 33333\n'],
  ['crlf', '1234567\r\n1234570\r\n1234571\r\n'],
  ['blank-lines', '1234567\n\n1234568\n\n\n1234569\n'],
  ['no-trailing-newline', '1234567\n1234568'],
  ['marker-in-input', '∆ 1234567\n1234568\n'],
  ['minus-after-mark', '2020-01-01\n2020-01-02\n2020-01-03\n'],
  ['dot-after-mark', '1234567.1234568\n1234570.1234571\n'],
  ['dash-number', '1234567-1234568\n1234570-1234571\n'],
  ['zero-delta', '5555555\n5555555\n5555555\n5555555\n'],
  ['first-line-only', '1234567 7654321\n'],
  ['big-number-15', '123456789012345\n123456789012350\n'],
  ['big-number-18', '123456789012345678\n123456789012345679\n'],
  ['unicode-around', 'α1234567β\nα1234570β\n'],
  ['many-runs', Array.from({ length: 30 }, (_, i) => Array.from({ length: 6 }, (_, j) => String(100000 + i * 37 + j * 1001)).join(' ')).join('\n')],
  ['decreasing-cols', '9999999 8888888\n9999990 8888881\n9999981 8888870\n'],
];

let pass = 0, fail = 0;
for (const [name, text] of cases) {
  const errs: string[] = [];
  const { out } = diaphoraSubstitute(text);
  try { if (diaphoraExpand(out) !== text) errs.push('transform: expand(sub(x)) != x'); }
  catch (e: any) { errs.push('transform threw: ' + String(e?.message ?? e)); }
  try {
    const r = diaphoraEncode(text, 'o200k_base');
    if (!r.exact) errs.push('encoder reports not exact');
    if (diaphoraDecode(r.wire) !== text) errs.push(`library decode mismatch on arm ${r.arm}`);
    console.log(JSON.stringify({ name, bytes: text.length, arm: r.arm, subs: r.subs, ok: errs.length === 0, errs }));
  } catch (e: any) {
    errs.push('encoder threw: ' + String(e?.message ?? e));
    console.log(JSON.stringify({ name, bytes: text.length, ok: false, errs }));
  }
  errs.length === 0 ? pass++ : fail++;
}
// Reader must refuse malformed wires (not silently guess).
const bad: [string, string][] = [
  ['mark-no-line-above', '∆5\n'],
  ['mark-leaves-nonneg', '1234\n∆-9999\n'],
];
for (const [name, wire] of bad) {
  let threw = false;
  try { diaphoraExpand(wire); } catch { threw = true; }
  console.log(JSON.stringify({ name, reader_refuses: threw }));
  threw ? pass++ : fail++;
}
console.log(JSON.stringify({ summary: true, cases: cases.length + bad.length, pass, fail }));
