// X17 probe: fixed-decimal-width canonicalization for delimited numeric columns.
// Transform: per column c with a constant decimal count D_c (= max decimals seen, all numeric cells in the column
// contain '.'), strip trailing zeros of each cell; the header line "@dp:" lists D_c per column.
// Inverse: pad each cell in column c to D_c digits. Exact iff inverse(forward(x)) == x (checked per file).
// M_new = o200k(extra contract sentence) + o200k(DAEDALUS-D message of transformed text). Baseline: DAEDALUS-D on raw.
import fs from 'node:fs';
import { daedalusDualEncode } from '@/lib/omega/daedalus-dual';
import { countTokens } from '@/lib/omega/bpe';

const NUM = /^-?\d+\.\d+$/;
const CONTRACT = 'Header @dp gives each numeric column its decimal count; pad every decimal cell to that count (CSV rows, commas).';

function forward(text: string): { out: string; dp: number[] } | null {
  const lines = text.split('\n');
  const hasTrailingNL = text.endsWith('\n');
  const body = hasTrailingNL ? lines.slice(0, -1) : lines;
  const rows = body.map(l => l.replace(/\r$/, '').split(','));
  const cols = Math.max(...rows.map(r => r.length));
  const dp: number[] = [];
  for (let c = 0; c < cols; c++) {
    let D = -1; let ok = true;
    for (const r of rows.slice(1)) {
      const v = r[c]; if (v === undefined) continue;
      if (NUM.test(v)) D = Math.max(D, v.split('.')[1].length);
    }
    // the column must be numeric in every data row (empty or non-numeric cell breaks the rule)
    for (const r of rows.slice(1)) { const v = r[c]; if (v === undefined || !NUM.test(v)) { ok = false; break; } }
    dp.push(ok && D > 0 ? D : 0);
  }
  const outRows = rows.map((r, i) => i === 0 ? r : r.map((v, c) => {
    if (dp[c] === 0 || v === undefined) return v;
    if (!NUM.test(v)) return v;
    return v.replace(/0+$/, '').replace(/\.$/, '');
  }));
  const hdr = '@dp:' + dp.join(',');
  const out = [hdr, ...outRows.map(r => r.join(','))].join('\n') + (hasTrailingNL ? '\n' : '');
  return { out, dp };
}
function restore(enc: string, dp: number[]): string {
  const lines = enc.split('\n');
  const hasTrailingNL = enc.endsWith('\n');
  const body = hasTrailingNL ? lines.slice(0, -1) : lines;
  const rows = body.slice(1).map(l => l.split(','));
  const out = rows.map((r, i) => r.map((v, c) => {
    if (i === 0 || dp[c] === 0 || v === undefined || v === '') return v;
    // a stripped cell is either "int." (all zeros removed) or "int.frac"; pad frac to dp
    if (!/^-?\d+\.?\d*$/.test(v)) return v;
    const [ip, fp = ''] = v.split('.');
    return ip + '.' + fp.padEnd(dp[c], '0');
  }).join(','));
  return out.join('\n') + (hasTrailingNL ? '\n' : '');
}

for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const base = daedalusDualEncode(text, 'o200k_base');
  const fw = forward(text);
  if (!fw) { console.log(JSON.stringify({ file: f, skip: 'no forward' })); continue; }
  const back = restore(fw.out, fw.dp);
  const exact = back === text;
  const t = daedalusDualEncode(fw.out, 'o200k_base');
  const extra = countTokens(CONTRACT, 'o200k_base');
  const tDecode = t.exact;
  console.log(JSON.stringify({
    file: f.split('/').pop(), dp: fw.dp.join(','), exact, wireExact: tDecode,
    rawTok: countTokens(text, 'o200k_base'), ddM: base.messageTokens.o200k_base,
    transformedDDM: t.messageTokens.o200k_base, extraContract: extra, newM: t.messageTokens.o200k_base + extra,
    delta: t.messageTokens.o200k_base + extra - base.messageTokens.o200k_base,
  }));
}
