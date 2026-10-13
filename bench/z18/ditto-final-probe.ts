// Final DITTO-F1 measurement, computed by the module itself (not a variant script).
// Columns: identity, DITTO-F1, VERITAS-VX (strongest ASCII-clean codec measured so far), and exact decode for each.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { dittoEncode, dittoDecode } from '@/lib/omega/ditto';
import { veritasEncode } from '@/lib/omega/veritas';
const files = ['find-listing.txt', 'ls-full-iso.txt', 'git-numstat.txt', 'npm-ls.txt', 'node-stacktraces.txt', 'openstack-loghub-26.log', 'git-log-fuller.txt'];
for (const f of files) {
  const t = fs.readFileSync(`bench/holdout-ops/${f}`, 'utf8');
  const d = dittoEncode(t, 'o200k_base');
  const v = veritasEncode(t, 'o200k_base');
  const vw = v.wire;
  const row = { f, identity: countTokens(t, 'o200k_base'), ditto: d.outTokens, ditto_mode: d.mode, marked: d.marked, ditto_exact: dittoDecode(d.wire) === t, veritas: countTokens(vw, 'o200k_base'), veritas_mode: v.mode, veritas_exact: v.decoded === t, ditto_ascii: /^[\x00-\x7f]*$/.test(d.wire) };
  console.log(JSON.stringify(row));
}
