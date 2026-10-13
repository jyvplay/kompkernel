// Z40: exercise src/lib/omega/daedalus-dual.ts on a few files; check o200k message count against daedalus's own M.
import fs from 'node:fs';
import { daedalusDualEncode } from '@/lib/omega/daedalus-dual';
import { daedalusEncode } from '@/lib/omega/daedalus';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const d = daedalusDualEncode(t);
  const base = daedalusEncode(t, 'o200k_base', {});
  console.log(JSON.stringify({ f: f.split('/').slice(-1)[0], mode: d.mode, exact: d.exact, arm: d.winningArm, inO: d.inTokens.o200k_base, inC: d.inTokens.cl100k_base, dualO: d.messageTokens.o200k_base, dualC: d.messageTokens.cl100k_base, daeM: base.messageTokens, ms: d.ms }));
}
