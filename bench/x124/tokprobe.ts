import { encodeIds } from '../../src/lib/omega/bpe';
import * as O200KMOD from 'gpt-tokenizer/encoding/o200k_base';
const gptDecode = (ids: number[]): string => ((O200KMOD as any).default?.decode ?? (O200KMOD as any).decode)(ids) as string;

const enc = 'o200k_base' as const;
function show(s: string) {
  const ids = encodeIds(s, enc);
  const parts = ids.map((i) => JSON.stringify(gptDecode([i])));
  console.log(String(ids.length).padStart(3), JSON.stringify(s), '->', parts.join(' '));
}
for (const s of ['root root 4096', 'root root4096', 'a 1 b 2', ' 4096 ', 'Nov 12 10:34', 'libfoo.so.1', 'x = 1', '{"a": 1, "b": 2}', '| id | name |', '%MEM 0.3', '1234 5678']) show(s);
// sentinel candidates: is p+digit one token?
console.log('\nsentinel probe (tokens for p+digits):');
for (const p of ['+', '-', '.', '/', ':', '*', '^', '~', '=', '%', '#', '@', '&', '!', '?', '|', '<', '>', '$']) {
  const ds = '0123456789'.split('').map((d) => String(encodeIds(p + d, enc).length));
  console.log(' ', p, ds.join(''), '  p+space+digit:', String(encodeIds(p + ' 4', enc).length));
}
