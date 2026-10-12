// DITTO-F1 probe over bench/holdout-ops: identity vs DITTO raw vs AMPHORA vs DITTO->AMPHORA vs CHIRON vs DITTO->CHIRON.
// Every codec output is decode-checked. AMPHORA runs with a non-binding DAEDALUS wall budget (see z16 receipts).
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { dittoEncode, dittoDecode } from '@/lib/omega/ditto';
import { amphoraEncode } from '@/lib/omega/amphora';
import { chironEncode } from '@/lib/omega/chiron';
const files = (process.argv[2] ?? 'find-listing.txt,ls-full-iso.txt,git-numstat.txt,npm-ls.txt,node-stacktraces.txt,openstack-loghub-26.log,git-log-fuller.txt').split(',');
const BUD = { daedalusBudgetMs: 120000 };
for (const f of files) {
  const t = fs.readFileSync(`bench/holdout-ops/${f}`, 'utf8');
  const row: Record<string, unknown> = { f, identity: countTokens(t, 'o200k_base') };
  const d = dittoEncode(t, 'o200k_base');
  row.ditto_mode = d.mode; row.marked = d.marked; row.ditto = d.outTokens; row.ditto_exact = dittoDecode(d.wire) === t;
  const dw = d.wire;
  const a = amphoraEncode(t, 'o200k_base', BUD);
  row.amphora = countTokens(a.wire ?? t, 'o200k_base'); row.amphora_exact = (a.decoded ?? t) === t;
  const aD = amphoraEncode(dw, 'o200k_base', BUD);
  row.ditto_amphora = countTokens(aD.wire ?? dw, 'o200k_base'); row.ditto_amphora_exact = (aD.decoded ?? dw) === dw;
  const c = chironEncode(t, 'o200k_base');
  row.chiron = countTokens(c.wire ?? t, 'o200k_base'); row.chiron_exact = (c.decoded ?? t) === t;
  const cD = chironEncode(dw, 'o200k_base');
  row.ditto_chiron = countTokens(cD.wire ?? dw, 'o200k_base'); row.ditto_chiron_exact = (cD.decoded ?? dw) === dw;
  console.log(JSON.stringify(row));
}
