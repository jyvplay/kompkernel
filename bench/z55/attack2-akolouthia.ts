// z55 attack 2 on the repaired AKOLOUTHIA: non-ASCII digit look-alikes and decimal points.
// Expected: non-ASCII digits are not numbers (JS \d is ASCII), so they stay literal; progressions in ASCII still fire.
import fs from 'node:fs';
import { akolouthiaEncode, akolouthiaDecode } from '@/lib/omega/akolouthia';
const cases: string[] = [
  Array.from({ length: 7 }, (_, i) => `r ${i + 1}０ ${i}٣ ${2 * i}² ${10 + 3 * i}.5`).join('\n') + '\n',
  Array.from({ length: 7 }, (_, i) => `f ${3 * i} ${3 * i + 1}.${i} ${i}٤`).join('\n') + '\n',
  Array.from({ length: 8 }, (_, i) => `k=${i * 4}\u00a0v=${i * 4 + 1}\u200b w=${9 - i}`).join('\n') + '\n',
];
const messages: string[] = [], expected: string[] = [];
for (const t of cases) {
  const r = akolouthiaEncode(t, 'o200k_base');
  const ok = akolouthiaDecode(r.wire, r.arm) === t;
  console.log(JSON.stringify({ arm: r.arm, marks: r.marks, tsExact: ok, M: r.messageTokens, plain: r.daedalus.messageTokens }));
  messages.push(r.decoderPrompt); expected.push(t);
}
fs.writeFileSync('bench/z55/receipts/attack2-akolouthia.messages.json', JSON.stringify(messages));
fs.writeFileSync('bench/z55/receipts/attack2-akolouthia.expected.json', JSON.stringify(expected));
// forced progression arm (not a savings claim): the reader must expand the non-ASCII look-alikes literally
import { akolouthiaSubstitute, AKOLOUTHIA_CONTRACT } from '@/lib/omega/akolouthia';
import { daedalusEncode, daedalusDecode } from '@/lib/omega/daedalus';
const fm: string[] = [], fe: string[] = [];
for (const t of cases) {
  const { out, marks } = akolouthiaSubstitute(t);
  if (!marks) continue;
  const d = daedalusEncode(out, 'o200k_base');
  fm.push(AKOLOUTHIA_CONTRACT + '\n' + d.decoderPrompt); fe.push(t);
  console.log(JSON.stringify({ forced: true, marks, daedalusExact: daedalusDecode(d.wire) === out }));
}
fs.writeFileSync('bench/z55/receipts/attack2-akolouthia.forced.messages.json', JSON.stringify(fm));
fs.writeFileSync('bench/z55/receipts/attack2-akolouthia.forced.expected.json', JSON.stringify(fe));
