import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const LANES = ['bench/holdout-x42/dpkg-l.txt','bench/holdout-x41/ps-aux-real.txt','bench/holdout-x41/ls-l-real.txt',
  'bench/holdout-x42/ps-ef.txt','bench/holdout-x41/ls-real.txt','bench/holdout-tbl/kubectl-get-pods.txt',
  'bench/holdout-tbl/psql-output.txt','bench/holdout-tbl/df-h.txt'];
for (const p of LANES) {
  const t = fs.readFileSync(p, 'utf8');
  const off = process.env.OMEGA_NO_PLATOS === '1' ? 0 : 0;
  const t0 = Date.now();
  const on = tagstackEncode(t, 'o200k_base');
  const msOn = Date.now() - t0;
  process.env.OMEGA_NO_PLATOS = '1';
  const t1 = Date.now();
  const b = tagstackEncode(t, 'o200k_base');
  const msOff = Date.now() - t1;
  delete process.env.OMEGA_NO_PLATOS;
  console.log(`${p.split('/').pop()!.padEnd(24)} off ${String(b.messageTokens).padStart(5)} (${msOff}ms)  on ${String(on.messageTokens).padStart(5)} (${msOn}ms)  Δ ${on.messageTokens - b.messageTokens}  exact ${on.decoded === t && b.decoded === t}  raw ${countTokens(t,'o200k_base')}`);
}
