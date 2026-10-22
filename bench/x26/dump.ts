import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { chironOpsUsed, CHIRON_SEP, CHIRON_START } from '@/lib/omega/chiron';
import { polytroposEncode } from '@/lib/omega/polytropos';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
for (const f of (process.env.F || 'bench/holdout-work/kb-article.txt').split(',')) {
  const t = fs.readFileSync(f, 'utf8');
  const r: any = polytroposEncode(t, enc);
  const wire = String(r.wire);
  const cut = wire.indexOf(CHIRON_SEP, CHIRON_START.length);
  const tape = wire.slice(CHIRON_START.length, cut);
  const body = wire.slice(cut + CHIRON_SEP.length);
  console.log('='.repeat(72));
  console.log(f.split('/').pop(), '| raw', T(t), '| wire', T(wire), '| tape', T(tape), '| body', T(body));
  console.log('tape chars', tape.length, '| body chars', body.length, '| source chars', t.length);
  console.log('--- TAPE (first 400 chars) ---');
  console.log(JSON.stringify(tape.slice(0, 400)));
  console.log('--- BODY (first 400 chars) ---');
  console.log(JSON.stringify(body.slice(0, 400)));
}
