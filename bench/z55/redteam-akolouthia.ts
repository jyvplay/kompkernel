// z55: red team for AKOLOUTHIA. Builds cases, runs the codec, checks TS round trip, and writes
// messages + expected texts for the CPython reader (bench/akolouthia_decode.py). Forced arm also tested:
// the progression wire is built even when it does not pay, so the reader sees every edge.
import fs from 'node:fs';
import { akolouthiaEncode, akolouthiaSubstitute, akolouthiaExpand, AKOLOUTHIA_CONTRACT, akolouthiaDecode } from '@/lib/omega/akolouthia';
import { daedalusEncode, daedalusDecode } from '@/lib/omega/daedalus';

type Case = { name: string; text: string };
const cases: Case[] = [];
const add = (name: string, text: string) => cases.push({ name, text });

add('svg-axis', Array.from({ length: 12 }, (_, i) => `<text x="${35 + 42 * i}" y="395">W${i + 1}</text>`).join('\n') + '\n');
add('node-names', Array.from({ length: 10 }, (_, i) => `node-${i} Ready ${i * 3}`).join('\n'));
add('ip-step', Array.from({ length: 8 }, (_, i) => `10.244.${i}.${i * 11} up`).join('\n'));
add('negatives', Array.from({ length: 6 }, (_, i) => `-${2 + i} delta ${100 - 5 * i}`).join('\n'));
add('leading-zeros', Array.from({ length: 7 }, (_, i) => `id=00${i + 1} v=${i}`).join('\n'));
add('decreasing', Array.from({ length: 6 }, (_, i) => `x ${50 - 4 * i} y`).join('\n'));
add('zero-step', Array.from({ length: 6 }, () => 'same 7 row').join('\n'));
add('marker-in-input', 'a ⁺ b\n1\n2\n3\n4\n5\n6\n');
add('big-numbers', Array.from({ length: 5 }, (_, i) => `n ${9007199254740990 + i}`).join('\n'));
add('very-long-digits', Array.from({ length: 5 }, (_, i) => `n ${'9'.repeat(15)}`).join('\n') + '\n');
add('short-two-lines', '1 2\n3 4\n');
add('short-four', '1\n2\n3\n4\n');
add('crlf', Array.from({ length: 6 }, (_, i) => `row ${i * 2}\r`).join('\n'));
add('ragged-counts', ['a 1 2 3', 'b 2 3', 'c 3 4 5 6', 'd 4 5', 'e 5 6 7 8', 'f 6 7'].join('\n'));
add('mixed-width', ['x 9', 'x 10', 'x 11', 'x 12', 'x 13', 'x 14'].join('\n'));
add('tabs-and-cols', Array.from({ length: 9 }, (_, i) => `${i}\t${10 * i}\t${100 + i}`).join('\n'));
add('empty-lines', ['1 a', '', '3 b', '', '5 c', '', '7 d', ''].join('\n'));
add('single-line', '42 is the answer\n');
add('nested-steps', ['1 1 1', '2 4 9', '3 7 25', '4 10 49', '5 13 81', '6 16 121'].join('\n'));
add('empty', '');

// seeded random grids: progressions in some columns, noise in others
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
for (let c = 0; c < 20; c++) {
  const rows = 4 + Math.floor(rnd() * 14);
  const cols = 1 + Math.floor(rnd() * 4);
  const start = Array.from({ length: cols }, () => Math.floor(rnd() * 500));
  const step = Array.from({ length: cols }, () => Math.floor(rnd() * 9) - 3);
  const L: string[] = [];
  for (let r = 0; r < rows; r++) {
    const parts: string[] = [];
    for (let k = 0; k < cols; k++) {
      const v = start[k] + step[k] * r;
      parts.push(rnd() < 0.2 ? String(Math.floor(rnd() * 999)) : String(v));
    }
    L.push(`r${parts.join(' | ')} tail${Math.floor(rnd() * 3)}`);
  }
  add('rand-' + c, L.join('\n') + (rnd() < 0.5 ? '\n' : ''));
}

const messages: string[] = [];
const expected: string[] = [];
const rows: any[] = [];
let tsFail = 0, progressionArms = 0;
for (const c of cases) {
  const r = akolouthiaEncode(c.text, 'o200k_base');
  const tsExact = akolouthiaDecode(r.wire, r.arm) === c.text && r.decoded === c.text;
  if (!tsExact) tsFail++;
  const row: any = { name: c.name, arm: r.arm, marks: r.marks, tsExact, M: r.messageTokens, plain: r.daedalus.messageTokens, pyChecked: false };
  if (r.arm === 'progression') { progressionArms++; messages.push(r.decoderPrompt); expected.push(c.text); row.pyChecked = true; }
  rows.push(row);
  // forced: the substitution and the DAEDALUS round trip, even when the arm does not pay
  if (c.text.includes('⁺')) continue;
  const { out, marks } = akolouthiaSubstitute(c.text);
  if (marks === 0) continue;
  const forcedOk = akolouthiaExpand(out) === c.text;
  const d = daedalusEncode(out, 'o200k_base');
  const forcedDec = daedalusDecode(d.wire) === out && akolouthiaExpand(daedalusDecode(d.wire)) === c.text;
  rows.push({ name: c.name, arm: 'forced', marks, tsExact: forcedOk && forcedDec, pyChecked: true });
  if (!(forcedOk && forcedDec)) tsFail++;
  messages.push(AKOLOUTHIA_CONTRACT + '\n' + d.decoderPrompt);
  expected.push(c.text);
}
fs.writeFileSync('bench/z55/receipts/redteam-akolouthia.messages.json', JSON.stringify(messages));
fs.writeFileSync('bench/z55/receipts/redteam-akolouthia.expected.json', JSON.stringify(expected));
fs.writeFileSync('bench/z55/receipts/redteam-akolouthia.ts.jsonl', rows.map(r => JSON.stringify(r)).join('\n') + '\n');
console.log(JSON.stringify({ cases: cases.length, progressionArms, messagesForPython: messages.length, tsFailures: tsFail }));
