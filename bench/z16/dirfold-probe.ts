// DIRFOLD-D1 measurement: identity vs DIRFOLD vs AMPHORA vs DIRFOLD->AMPHORA, over bench/holdout-ops.
// Every row checks exact round trip on the decoded output.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { dirfoldEncode, dirfoldDecode } from '@/lib/omega/dirfold';
import { amphoraEncode } from '@/lib/omega/amphora';

const files = ['find-listing.txt', 'ls-full-iso.txt', 'git-numstat.txt', 'npm-ls.txt', 'node-stacktraces.txt', 'openstack-loghub-26.log', 'git-log-fuller.txt'];
const rows: any[] = [];
for (const f of files) {
  const p = `bench/holdout-ops/${f}`;
  const t = fs.readFileSync(p, 'utf8');
  const id = countTokens(t, 'o200k_base');
  const d = dirfoldEncode(t, 'o200k_base');
  const dRT = dirfoldDecode(d.wire) === t;
  const BUD = { daedalusBudgetMs: 120000 }; // non-binding wall budget: AMPHORA's DAEDALUS arm is clock-budgeted
  const t0 = Date.now();
  const a = amphoraEncode(t, 'o200k_base', BUD);
  const msA = Date.now() - t0;
  const aRT = (a.decoded ?? t) === t;
  const dA = amphoraEncode(d.wire, 'o200k_base', BUD);
  const dARTok = dA.wire ?? d.wire;
  const dARt = (dA.decoded ?? d.wire) === d.wire && dRT;
  const row = { f, identity: id, dirfold: d.mode, folded: d.folded, dirfold_tok: d.outTokens, dirfold_exact: dRT, amphora_tok: countTokens(a.wire ?? t, 'o200k_base'), amphora_exact: aRT, dirfold_then_amphora_tok: countTokens(dARTok, 'o200k_base'), stacked_exact: dARt, amphora_ms: msA };
  rows.push(row);
  console.log(JSON.stringify(row));
}
fs.writeFileSync('bench/z16/dirfold-probe.json', JSON.stringify(rows, null, 1));
