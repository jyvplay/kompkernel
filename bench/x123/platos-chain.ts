import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { platosTransform, PLATOS_CONTRACT } from '../../src/lib/omega/platos';
const LANES = ['bench/holdout-x42/dpkg-l.txt','bench/holdout-x42/ps-ef.txt','bench/holdout-x41/ls-real.txt',
  'bench/holdout-tbl/kubectl-get-pods.txt','bench/holdout-tbl/psql-output.txt','bench/holdout-tbl/df-h.txt'];
for (const p of LANES) {
  const t = fs.readFileSync(p, 'utf8');
  const base = tagstackEncode(t, 'o200k_base');
  const tr = platosTransform(t);
  if (!tr) { console.log(p.split('/').pop(), 'no fit; base', base.messageTokens); continue; }
  const child = tagstackEncode(tr.text, 'o200k_base');
  const msg = PLATOS_CONTRACT + '\n' + child.message;
  const tot = countTokens(msg, 'o200k_base');
  console.log(`${p.split('/').pop()!.padEnd(22)} base ${String(base.messageTokens).padStart(5)}  child ${String(child.messageTokens).padStart(5)}  +contract ${String(tot).padStart(5)}  Δ ${tot - base.messageTokens}  pad ${tr.blk.padMass}  exact ${child.decoded === tr.text}`);
}
