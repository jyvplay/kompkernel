import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { polytroposEncode } from '@/lib/omega/polytropos';
import { psephosEncode } from '@/lib/omega/psephos';
const enc = 'o200k_base' as any;
const f = process.env.F || 'bench/z48/corpus/svenstaro_miniserve.md';
const t = fs.readFileSync(f, 'utf8');
console.log('file', f, 'raw', countTokens(t, enc));
// polytropos is TIME-BUDGETED, so repeated calls are not guaranteed identical.
// Measure that variance directly: it bounds what any cross-run comparison can claim.
for (let i = 0; i < 3; i++) {
  const r: any = polytroposEncode(t, enc);
  console.log('  polytropos run', i, 'wire', countTokens(String(r.wire), enc), 'msg', r.messageTokens);
}
for (let i = 0; i < 3; i++) {
  const r = psephosEncode(t, enc);
  console.log('  psephos    run', i, 'msg', r.messageTokens, r.parent + '/' + r.order,
    r.stats.formats.filter((x: any) => x.enabled).map((x: any) => x.name + ':' + x.mode).join(' '));
}
