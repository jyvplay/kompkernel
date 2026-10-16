import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { lakonikosDualEncode } from '@/lib/omega/lakonikos-d';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { lakonikosEncode } from '@/lib/omega/lakonikos';
import { dpeEncode, dpeDecode } from './dpe';

const CONTRACT = ' In digit runs: 8 digits reading as a valid YYYYMMDD become YYYY-MM-DD; T plus 6 digits becomes T HH:MM:SS, T plus 4 digits T HH:MM.';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const baseLkd = lakonikosDualEncode(t, 'o200k_base');
  const baseM = baseLkd.messageTokens.o200k_base;
  const rawTok = countTokens(t, 'o200k_base');
  const e = dpeEncode(t);
  if (!e) { console.log(JSON.stringify({ file: f.split('/').pop(), rawTok, baseM, dpe: 'REFUSED' })); continue; }
  const exact = dpeDecode(e.out) === t;
  const subTok = countTokens(e.out, 'o200k_base');
  const d = lakonikosDualEncode(e.out, 'o200k_base');
  const M = d.messageTokens.o200k_base + countTokens(CONTRACT, 'o200k_base');
  console.log(JSON.stringify({ file: f.split('/').pop(), rawTok, baseM, exact, dates: e.dates, times: e.times, subTok, wireM: d.messageTokens.o200k_base, contractTok: countTokens(CONTRACT, 'o200k_base'), M, delta: M - baseM }));
}
