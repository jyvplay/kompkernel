// KOINE-K1 sweep: minimum shared-prefix length, KOINE placed (a) after DITTO before VERITAS, (b) after VERITAS.
// Every wire is decode-checked (EXACT column). o200k_base.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { uuidfoldEncode, uuidfoldDecode } from '@/lib/omega/uuidfold';
import { dirfoldAEncode, dirfoldADecode } from '@/lib/omega/dirfold-a';
import { dittoEncode, dittoDecode } from '@/lib/omega/ditto';
import { veritasEncode, veritasDecode } from '@/lib/omega/veritas';
import { koineEncode, koineDecode, koineDecodeBody, KOINE_HEADER } from '@/lib/omega/koine';

const files = [
  ...['find-listing.txt', 'ls-full-iso.txt', 'git-numstat.txt', 'npm-ls.txt', 'node-stacktraces.txt', 'openstack-loghub-26.log', 'git-log-fuller.txt', 'package-lock-head.json'].map(f => `bench/holdout-ops/${f}`),
  ...fs.readdirSync('bench/holdout').map(f => `bench/holdout/${f}`),
];
const mins = [4, 6, 8, 12, 16];
const header = ['file', 'id', 'PH(U,DA,T,V)', ...mins.map(m => `T,K${m},V`), ...mins.map(m => `T,V,K${m}`)];
console.log(header.join(' | '));
const tot: Record<string, number> = {};
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const u = uuidfoldEncode(t, 'o200k_base').wire;
  const da = dirfoldAEncode(u, 'o200k_base').wire;
  const ti = dittoEncode(da, 'o200k_base').wire;
  const cells: string[] = [];
  const ph = veritasEncode(ti, 'o200k_base').wire;
  const row: Record<string, number> = { id: countTokens(t, 'o200k_base'), PH: countTokens(ph, 'o200k_base') };
  cells.push(String(row.PH));
  for (const m of mins) {
    // K between DITTO and VERITAS: encode K on DITTO wire, then V; check the full inverse
    const k = koineEncode(ti, 'o200k_base', m);
    const v = veritasEncode(k.wire, 'o200k_base').wire;
    const back = dittoDecode(koineDecode(veritasDecode(v)));
    const dback = dirfoldADecode(back), uback = uuidfoldDecode(dback);
    const ok = uback === t;
    const key = `TKV${m}`; row[key] = countTokens(v, 'o200k_base');
    cells.push(String(row[key]) + (ok ? '' : '!!'));
  }
  for (const m of mins) {
    const v = veritasEncode(ti, 'o200k_base').wire;
    const k = koineEncode(v, 'o200k_base', m);
    const back = veritasDecode(koineDecode(k.wire));
    const ok = back === ti;
    const tokn = countTokens(k.wire, 'o200k_base');
    row[`TVK${m}`] = tokn;
    cells.push(String(tokn) + (ok ? '' : '!!'));
  }
  for (const key of Object.keys(row)) tot[key] = (tot[key] ?? 0) + row[key];
  console.log([f.replace('bench/', ''), row.id, ...cells].join(' | '));
}
console.log('TOTAL ' + JSON.stringify(tot));
