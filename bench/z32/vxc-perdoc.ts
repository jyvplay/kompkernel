// Z32: per-document VERITAS-C (shipped encoder) wire tokens and exactness, for the DAEDALUS frontier comparison.
import fs from 'node:fs';
import { veritasCEncode, veritasCDecode } from '@/lib/omega/veritas-c';
import { countTokens } from '@/lib/omega/bpe';
const rows: [string, string][] = [];
for (const l of fs.readFileSync('/home/user/z31/groups-list.tsv', 'utf8').split('\n').filter(Boolean)) { const [g, f] = l.split('\t'); rows.push([g, f.startsWith('/') ? f : '/home/user/kompkernel/' + f]); }
for (const l of fs.readFileSync('/home/user/z31/fresh-list.tsv', 'utf8').split('\n').filter(Boolean)) { const [, f] = l.split('\t'); rows.push(['fresh', f]); }
const out = process.argv[2];
fs.writeFileSync(out, '');
for (const [g, f] of rows) {
  const t = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = veritasCEncode(t, 'o200k_base');
  const ok = veritasCDecode(r.wire) === t;
  fs.appendFileSync(out, JSON.stringify({ group: g, file: f, inTokens: r.inTokens, outTokens: countTokens(r.wire, 'o200k_base'), exact: ok, mode: r.mode, ms: Date.now() - t0 }) + '\n');
}
console.log('done', rows.length);
