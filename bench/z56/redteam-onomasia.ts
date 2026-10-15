// z56: red team for ONOMASIA. TS round trip for every case; forced keyed arm on cases where the
// substitution fires (correctness, not savings). Writes messages + expected for the CPython reader.
import fs from 'node:fs';
import { onomasiaEncode, onomasiaSubstitute, onomasiaExpand, onomasiaDecode, ONOMASIA_CONTRACT } from '@/lib/omega/onomasia';
import { daedalusEncode, daedalusDecode } from '@/lib/omega/daedalus';
const cases: { name: string; text: string }[] = [];
const add = (name: string, text: string) => cases.push({ name, text });
add('refs', Array.from({ length: 9 }, (_, i) => `[${i + 1}] Author ${i}, Title ${i * 3}, p. ${10 + 2 * i}`).join('\n') + '\n');
add('svg-attrs', Array.from({ length: 10 }, (_, i) => `<rect x="${35 + 42 * i}" y="${200 - 3 * i}" w="40"/>`).join('\n'));
add('var-counts', ['id=1 n=5', 'id=2 n=6 x 9', 'id=3 n=7 x 11 y 2', 'id=4 n=8', 'id=5 n=9 x 13', 'id=6 n=10'].join('\n'));
add('dup-keys', ['a 1 1 1', 'a 2 2 2', 'a 3 3 3', 'a 4 4 4', 'a 5 5 5', 'a 6 6 6'].join('\n'));
add('line-start-digits', ['5 apples', '7 apples', '9 apples', '11 apples', '13 apples'].join('\n'));
add('ip-keys', Array.from({ length: 8 }, (_, i) => `10.244.${i}.${i * 11} up`).join('\n'));
add('negatives', Array.from({ length: 6 }, (_, i) => `-${2 + i} delta ${100 - 5 * i}`).join('\n'));
add('leading-zeros', Array.from({ length: 7 }, (_, i) => `id=00${i + 1} v=${i}`).join('\n'));
add('zero-step', Array.from({ length: 6 }, () => 'same 7 row').join('\n'));
add('marker-in-input', 'a ⁺ b\n1 x\n2 x\n3 x\n4 x\n5 x\n');
add('long-digits', Array.from({ length: 5 }, () => `n ${'9'.repeat(15)}`).join('\n') + '\n');
add('short', '1 x\n2 x\n3 x\n');
add('crlf', Array.from({ length: 6 }, (_, i) => `row ${i * 2}\r`).join('\n'));
add('keys-with-punct', Array.from({ length: 6 }, (_, i) => `k:${i * 2}/n=${5 + i}/m-${100 + 4 * i}`).join('\n'));
add('empty', '');
let seed = 777;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
for (let c = 0; c < 16; c++) {
  const rows = 4 + Math.floor(rnd() * 12);
  const L: string[] = [];
  const keys = ['x=', 'y=', 'id-', 'n', '#', ''];
  const starts = keys.map(() => Math.floor(rnd() * 300));
  const steps = keys.map(() => Math.floor(rnd() * 7) - 2);
  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let k = 0; k < keys.length; k++) {
      if (rnd() < 0.3) continue; // keys come and go: positional alignment breaks, keyed does not
      const v = starts[k] + steps[k] * r;
      line += `${keys[k]}${rnd() < 0.15 ? Math.floor(rnd() * 99) : v} `;
    }
    L.push(line.trimEnd() + ' end');
  }
  add('rand-' + c, L.join('\n') + (rnd() < 0.5 ? '\n' : ''));
}
const messages: string[] = [], expected: string[] = [], rows: any[] = [];
let tsFail = 0, keyedArms = 0;
for (const c of cases) {
  const r = onomasiaEncode(c.text, 'o200k_base');
  const ok = onomasiaDecode(r.wire, r.arm) === c.text && r.decoded === c.text;
  if (!ok) tsFail++;
  if (r.arm === 'keyed') { keyedArms++; messages.push(r.decoderPrompt); expected.push(c.text); }
  rows.push({ name: c.name, arm: r.arm, marks: r.marks, tsExact: ok, M: r.messageTokens });
  if (c.text.includes('⁺')) continue;
  const { out, marks } = onomasiaSubstitute(c.text);
  if (!marks) continue;
  const fwd = onomasiaExpand(out) === c.text;
  const d = daedalusEncode(out, 'o200k_base');
  const dec = daedalusDecode(d.wire) === out && onomasiaExpand(daedalusDecode(d.wire)) === c.text;
  rows.push({ name: c.name, arm: 'forced', marks, tsExact: fwd && dec });
  if (!(fwd && dec)) tsFail++;
  messages.push(ONOMASIA_CONTRACT + '\n' + d.decoderPrompt); expected.push(c.text);
}
fs.writeFileSync('bench/z56/receipts/redteam-onomasia.messages.json', JSON.stringify(messages));
fs.writeFileSync('bench/z56/receipts/redteam-onomasia.expected.json', JSON.stringify(expected));
fs.writeFileSync('bench/z56/receipts/redteam-onomasia.ts.jsonl', rows.map(r => JSON.stringify(r)).join('\n') + '\n');
console.log(JSON.stringify({ cases: cases.length, keyedArms, messagesForPython: messages.length, tsFailures: tsFail }));
