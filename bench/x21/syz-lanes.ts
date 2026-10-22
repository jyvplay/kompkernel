import fs from 'node:fs';
import { syzeuxisEncode, syzeuxisDecode } from '@/lib/omega/syzeuxis';
import { countTokens } from '@/lib/omega/bpe';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const r = syzeuxisEncode(t, 'o200k_base' as any);
  const back = syzeuxisDecode(r.wire, { arm: r.arm, rules: r.rules, sep: r.sep, after: r.after, tag: r.tag });
  console.log(JSON.stringify({ file: f.split('/').pop(), ident: r.inTokens, M: r.messageTokens, arm: r.arm, exact: back === t, armTokens: r.armTokens, transpose: r.transpose, rules: r.rules }));
}
