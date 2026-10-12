// Estimate for a byte-exact columnar layer on uniform arrays of records (GitHub API commit list, real data).
// Layout: header row = keys (tab-separated); one row per record; each cell = JSON.stringify(value) (minified).
// Tabs/newlines never occur raw inside JSON literals, so they are safe separators.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxA2Encode } from '@/lib/omega/phalanx-a2';
import { phalanxA3Encode } from '@/lib/omega/phalanx-a3';
const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const v = JSON.parse(text) as Record<string, unknown>[];
  const keys = Object.keys(v[0]);
  const rows = v.map((o) => keys.map((k) => JSON.stringify(o[k])).join('\t'));
  const columnar = keys.join('\t') + '\n' + rows.join('\n') + '\n';
  const minified = JSON.stringify(v);
  const id = countTokens(text, enc);
  const a3 = phalanxA3Encode(text, enc).outTokens;
  const a2min = phalanxA2Encode(minified, enc).outTokens;
  const a2col = phalanxA2Encode(columnar, enc).outTokens;
  const rt = (() => { // the columnar form must rebuild the exact text (checked here, the codec would check it too)
    const hdr = columnar.split('\n')[0].split('\t');
    const body = columnar.slice(columnar.indexOf('\n') + 1).split('\n').filter((x) => x.length);
    const recs = body.map((r) => { const cells = r.split('\t'); const o: Record<string, unknown> = {}; hdr.forEach((k, i) => { o[k] = JSON.parse(cells[i]); }); return o; });
    return JSON.stringify(recs, null, 2) + '\n' === text;
  })();
  console.log(`${f}: identity=${id} A3(pretty)=${a3} A2(minified)=${a2min} A2(columnar)=${a2col} columnar-vs-A3=${a2col - a3} (${(((a2col - a3) / a3) * 100).toFixed(1)}%) columnar round trip=${rt}`);
}
