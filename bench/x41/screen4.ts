// Re-measure template coverage after the run-scanner fix.
import { readFileSync } from 'node:fs';
import { encode } from 'gpt-tokenizer';
import { systoleFind, systoleChoose, systoleApply, systoleUndo, systoleUnambiguous, systoleClauseFor } from '@/lib/omega/systole';
const enc: any = 'o200k_base';
const tok = (s: string) => encode(s).length;
for (const p of (process.env.LANES ?? '').split(',').filter(Boolean)) {
  const t = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  const all = systoleFind(t, enc);
  const ch = systoleChoose(t, enc);
  const rawAll = all.reduce((s, x) => s + x.save, 0);
  const rawCh = ch.reduce((s, x) => s + x.save, 0);
  const ok = systoleUnambiguous(t, ch);
  const app = systoleApply(t, ch);
  const rt = systoleUndo(app, ch) === t;
  console.log(
    nm.padEnd(24),
    'shapes=' + String(all.length).padStart(2),
    'rawAll=' + String(rawAll).padStart(5),
    'chosen=' + ch.length,
    'rawChosen=' + String(rawCh).padStart(5),
    'unamb=' + (ok ? 'Y' : 'n'),
    'roundtrip=' + (rt ? 'OK' : 'FAIL'),
    'clauseTok=' + (ch.length ? tok(' ' + systoleClauseFor(ch) + ' print only.') - tok(' print only.') : 0),
    '|', ch.map((x) => x.digits + ':' + x.shape).join(' '),
  );
}
