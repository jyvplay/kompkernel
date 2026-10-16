// X12 red team for ANAPHORA: TS round trip on edge cases + seeded random tables; forced fold arm for the
// CPython reader (bench/anaphora_fold_decode.py). Writes messages + expected; never trusts the gate.
import fs from 'node:fs';
import { anaphoraFoldSubstitute, anaphoraFoldExpand, anaphoraFoldEncode, ANAPHORA_FOLD_CONTRACT, ANAPHORA_FOLD_K } from '@/lib/omega/anaphora-fold';
import { daedalusEncode, daedalusDecode } from '@/lib/omega/daedalus';
const cases: { name: string; text: string }[] = [];
const add = (name: string, text: string) => cases.push({ name, text });
add('ps-like', ['USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND', ...Array.from({ length: 12 }, (_, i) => `user ${1000 + i} 0.${i} 0.1 ${200000 + i} ${9000 + i} pts/0 S 10:0${i % 6} 0:00 node x${i % 3}`)].join('\n'));
add('identical-lines', Array.from({ length: 8 }, () => 'alpha beta gamma delta').join('\n'));
add('double-space-empty-fields', ['a  b  c', 'a  b  d', 'a  x  c', 'a  b  c d'].join('\n'));
add('leading-trailing-spaces', [' a b ', ' a c ', 'a b ', ' a b ', '  '].join('\n'));
add('literal-at-line', ['x y z', '@user y z', '@user y q', 'x y z'].join('\n'));
add('header-like-input-refused', ['x y', '@1,1,0|z', 'x y'].join('\n'));
add('crlf', ['k v w\r', 'k v x\r', 'k v y\r', 'k v z\r'].join('\n'));
add('empty-lines', ['', '', 'a b', '', 'a b', ''].join('\n'));
add('single-line', 'only one line here');
add('empty-text', '');
add('unicode-fields', ['名前 値 合計', '名前 値 小計', '名前 値 合計 外', '名前 値 合計'].join('\n'));
add('k-reach-16', Array.from({ length: 20 }, (_, i) => `row ${i % 17} const tail`).join('\n'));
add('mid-single-empty-field-trap', ['a  b', 'a  b', 'a  c', 'a c'].join('\n'));
let seed = 571;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
for (let c = 0; c < 24; c++) {
  const rows = 4 + Math.floor(rnd() * 25);
  const width = 2 + Math.floor(rnd() * 7);
  const base = Array.from({ length: width }, () => ['x', 'yy', '17', 'pod-a', '2026-10-15', '-', ''][Math.floor(rnd() * 7)]);
  const L: string[] = [];
  for (let r = 0; r < rows; r++) {
    const f = base.slice();
    for (let k = 0; k < width; k++) if (rnd() < 0.3) f[k] = rnd() < 0.5 ? String(Math.floor(rnd() * 99999)) : 'v' + Math.floor(rnd() * 9);
    if (rnd() < 0.1) f.splice(Math.floor(rnd() * f.length), 0, '');
    L.push(f.join(rnd() < 0.85 ? ' ' : '  '));
  }
  add('rand-' + c, L.join('\n') + (rnd() < 0.5 ? '\n' : ''));
}
const messages: string[] = [], expected: string[] = [], rows: any[] = [];
let tsFail = 0, foldArms = 0;
for (const c of cases) {
  const { out, folds } = anaphoraFoldSubstitute(c.text, ANAPHORA_FOLD_K, 'o200k_base');
  let fwdOk = false; try { fwdOk = anaphoraFoldExpand(out) === c.text; } catch { fwdOk = false; }
  const r = anaphoraFoldEncode(c.text, 'o200k_base');
  const rt = anaphoraFoldDecode2(r.wire, r.arm) === c.text;
  if (!fwdOk && folds > 0) tsFail++;
  if (!rt) tsFail++;
  rows.push({ name: c.name, folds, forwardExact: folds === 0 ? 'n/a' : fwdOk, arm: r.arm, roundTripExact: rt, M: r.messageTokens });
  if (folds > 0 && fwdOk) {
    const d = daedalusEncode(out, 'o200k_base');
    if (daedalusDecode(d.wire) !== out) tsFail++;
    foldArms++;
    messages.push(ANAPHORA_FOLD_CONTRACT + '\n' + d.decoderPrompt);
    expected.push(c.text);
  }
}
function anaphoraFoldDecode2(wire: string, arm: string) { return arm === 'fold' ? anaphoraFoldExpand(daedalusDecode(wire)) : daedalusDecode(wire); }
fs.writeFileSync('bench/z57/receipts/redteam-anaphora.messages.json', JSON.stringify(messages));
fs.writeFileSync('bench/z57/receipts/redteam-anaphora.expected.json', JSON.stringify(expected));
fs.writeFileSync('bench/z57/receipts/redteam-anaphora.ts.jsonl', rows.map(r => JSON.stringify(r)).join('\n') + '\n');
console.log(JSON.stringify({ cases: cases.length, foldArmForced: foldArms, pythonMessages: messages.length, tsFailures: tsFail }));
