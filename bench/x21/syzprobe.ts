import fs from 'node:fs';
import { syzeuxisEncode, syzeuxisDecode } from '@/lib/omega/syzeuxis';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = syzeuxisEncode(t, 'o200k_base' as any);
  const back = syzeuxisDecode(r.wire, { arm: r.arm, rules: r.rules, sep: r.sep, after: r.after, tag: r.tag });
  const name = f.split('/').pop()!;
  const arms = Object.entries(r.armTokens).map(([k, v]) => `${k}=${v}`).join(' ');
  console.log(`${name.padEnd(28)} ident=${String(r.inTokens).padStart(5)} M=${String(r.messageTokens).padStart(5)} exact=${back === t}  ${r.arm.padEnd(11)} [${arms}]  ${Date.now() - t0}ms`);
}
