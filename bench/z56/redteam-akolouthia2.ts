// z56: red team for AKOLOUTHIA-2 (two-term eligibility). TS round trip for all cases; forced progression arm on
// cases where the substitution fires; writes messages + expected for the CPython reader (bench/akolouthia_decode.py).
import fs from 'node:fs';
import { akolouthia2Encode, akolouthia2Substitute, akolouthia2Decode, AKOLOUTHIA2_CONTRACT } from '@/lib/omega/akolouthia2';
import { akolouthiaExpand } from '@/lib/omega/akolouthia';
import { daedalusEncode, daedalusDecode } from '@/lib/omega/daedalus';
const cases: { name: string; text: string }[] = [];
const add = (name: string, text: string) => cases.push({ name, text });
add('svg-axis', Array.from({ length: 12 }, (_, i) => `<text x="${35 + 42 * i}" y="395">W${i + 1}</text>`).join('\n') + '\n');
add('two-line-coincidence', '1 5\n2 6\n3 7\n9 9\n4 4\n');
add('node-names', Array.from({ length: 10 }, (_, i) => `node-${i} Ready ${i * 3}`).join('\n'));
add('ip-step', Array.from({ length: 8 }, (_, i) => `10.244.${i}.${i * 11} up`).join('\n'));
add('negatives', Array.from({ length: 6 }, (_, i) => `-${2 + i} delta ${100 - 5 * i}`).join('\n'));
add('leading-zeros', Array.from({ length: 7 }, (_, i) => `id=00${i + 1} v=${i}`).join('\n'));
add('zero-step', Array.from({ length: 6 }, () => 'same 7 row').join('\n'));
add('marker-in-input', 'a ⁺ b\n1 x\n2 x\n3 x\n4 x\n5 x\n');
add('big-numbers', Array.from({ length: 5 }, (_, i) => `n ${9007199254740990 + i}`).join('\n'));
add('very-long-digits', Array.from({ length: 5 }, () => `n ${'9'.repeat(15)}`).join('\n') + '\n');
add('short-two-lines', '1 2\n3 4\n');
add('short-three', '1\n2\n3\n');
add('crlf', Array.from({ length: 6 }, (_, i) => `row ${i * 2}\r`).join('\n'));
add('ragged-counts', ['a 1 2 3', 'b 2 3', 'c 3 4 5 6', 'd 4 5', 'e 5 6 7 8', 'f 6 7'].join('\n'));
add('tabs-and-cols', Array.from({ length: 9 }, (_, i) => `${i}\t${10 * i}\t${100 + i}`).join('\n'));
add('empty-lines', ['1 a', '', '3 b', '', '5 c', '', '7 d', ''].join('\n'));
add('nested-steps', ['1 1 1', '2 4 9', '3 7 25', '4 10 49', '5 13 81', '6 16 121'].join('\n'));
add('nbsp-zwsp', Array.from({ length: 6 }, (_, i) => `k=${i * 4}\u00a0v=${i * 4 + 1}\u200b w=${9 - i}`).join('\n') + '\n');
add('fullwidth-digits', Array.from({ length: 6 }, (_, i) => `r ${i + 1}０ ${i}٣ ${2 * i}²`).join('\n') + '\n');
add('empty', '');
let seed = 4242;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
for (let c = 0; c < 20; c++) {
  const rows = 3 + Math.floor(rnd() * 14);
  const cols = 1 + Math.floor(rnd() * 4);
  const start = Array.from({ length: cols }, () => Math.floor(rnd() * 500));
  const step = Array.from({ length: cols }, () => Math.floor(rnd() * 9) - 3);
  const L: string[] = [];
  for (let r = 0; r < rows; r++) {
    const parts: string[] = [];
    for (let k = 0; k < cols; k++) parts.push(rnd() < 0.25 ? String(Math.floor(rnd() * 999)) : String(start[k] + step[k] * r));
    L.push(`r${parts.join(' | ')} tail${Math.floor(rnd() * 3)}`);
  }
  add('rand-' + c, L.join('\n') + (rnd() < 0.5 ? '\n' : ''));
}
const messages: string[] = [], expected: string[] = [], rows: any[] = [];
let tsFail = 0, progArms = 0;
for (const c of cases) {
  const r = akolouthia2Encode(c.text, 'o200k_base');
  const ok = akolouthia2Decode(r.wire, r.arm) === c.text && r.decoded === c.text;
  if (!ok) tsFail++;
  if (r.arm === 'progression') { progArms++; messages.push(r.decoderPrompt); expected.push(c.text); }
  rows.push({ name: c.name, arm: r.arm, marks: r.marks, tsExact: ok, M: r.messageTokens, plain: daedalusEncode(c.text, 'o200k_base').messageTokens });
  if (c.text.includes('⁺')) continue;
  const { out, marks } = akolouthia2Substitute(c.text);
  if (!marks) continue;
  const fwd = akolouthiaExpand(out) === c.text;
  const d = daedalusEncode(out, 'o200k_base');
  const dec = daedalusDecode(d.wire) === out && akolouthiaExpand(daedalusDecode(d.wire)) === c.text;
  rows.push({ name: c.name, arm: 'forced', marks, tsExact: fwd && dec });
  if (!(fwd && dec)) tsFail++;
  messages.push(AKOLOUTHIA2_CONTRACT + '\n' + d.decoderPrompt); expected.push(c.text);
}
fs.writeFileSync('bench/z56/receipts/redteam-akolouthia2.messages.json', JSON.stringify(messages));
fs.writeFileSync('bench/z56/receipts/redteam-akolouthia2.expected.json', JSON.stringify(expected));
fs.writeFileSync('bench/z56/receipts/redteam-akolouthia2.ts.jsonl', rows.map(r => JSON.stringify(r)).join('\n') + '\n');
console.log(JSON.stringify({ cases: cases.length, progressionArms: progArms, messagesForPython: messages.length, tsFailures: tsFail }));
