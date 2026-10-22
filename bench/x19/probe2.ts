import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { lakonikosDualEncode } from '@/lib/omega/lakonikos-d';
import { lakonikosEncode } from '@/lib/omega/lakonikos';
import { dpeEncode, dpeDecode, DPE_RULE_SHORT, DPE_RULE_LONG, thouEncode, thouDecode, THOU_RULE, reflowEncode, reflowDecode, reflowRule } from './xforms';

for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const lkd = lakonikosDualEncode(t, 'o200k_base');
  const lk = lakonikosEncode(t, 'o200k_base');
  const lkM = lk.messageTokens as unknown as number;
  const base = Math.min(lkd.messageTokens.o200k_base, lkM);
  const rawTok = countTokens(t, 'o200k_base');
  const row: any = { file: f.split('/').pop(), rawTok, lkd: lkd.messageTokens.o200k_base, lk: lk.messageTokens.o200k_base, base };
  const arm = (sub: string, rule: string, dec: (s: string) => string) => {
    if (dec(sub) !== t) { row[rule.slice(0, 6)] = 'INEXACT'; return; }
    const a = lakonikosDualEncode(sub, 'o200k_base');
    const b = lakonikosEncode(sub, 'o200k_base');
    const M = Math.min(a.messageTokens.o200k_base, b.messageTokens as unknown as number) + countTokens(rule, 'o200k_base');
    return M - base;
  };
  const d = dpeEncode(t);
  row.dpeL = d === null ? 'REFUSED' : arm(d, DPE_RULE_LONG, dpeDecode);
  if (d !== null) row.dpeS = arm(d, DPE_RULE_SHORT, dpeDecode);
  const th = thouEncode(t);
  row.thou = th === null ? 'NONE' : arm(th, THOU_RULE, thouDecode);
  const rf = reflowEncode(t);
  if (rf) row.reflow = arm(rf.out, reflowRule(rf.width), (s) => reflowDecode(s, rf.width));
  else row.reflow = 'NONE';
  console.log(JSON.stringify(row));
}
