import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { platosTransform } from '../../src/lib/omega/platos';
const INSTR = ' — {K} records: line 1 sets each column width, R means pad left; the others give the same fields joined by single spaces. Re-pad them, then drop this line.';
const LANES = ['bench/holdout-x42/dpkg-l.txt','bench/holdout-tbl/kubectl-get-pods.txt','bench/holdout-x41/ls-real.txt','bench/holdout-tbl/df-h.txt','bench/holdout-tbl/psql-output.txt'];
for (const p of LANES) {
  const t = fs.readFileSync(p, 'utf8');
  const base = tagstackEncode(t, 'o200k_base');
  const tr = platosTransform(t);
  if (!tr) { console.log(p.split('/').pop(), 'no fit; base', base.messageTokens); continue; }
  const ext = tr.text.replace(tr.mk, tr.mk + INSTR.replace('{K}', String(tr.blk.rows.length)));
  const child = tagstackEncode(ext, 'o200k_base');
  console.log(`${p.split('/').pop()!.padEnd(22)} base ${String(base.messageTokens).padStart(5)}  child+instr ${String(child.messageTokens).padStart(5)}  Δ ${child.messageTokens - base.messageTokens}  pad ${tr.blk.padMass}  exact ${child.decoded === ext}`);
}
