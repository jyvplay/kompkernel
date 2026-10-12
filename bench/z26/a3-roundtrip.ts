// Round-trip check for PHALANX-A3 (committed codec) over the same corpus groups used in the z26 probes. Real files only.
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxA3Encode, phalanxA3Decode } from '@/lib/omega/phalanx-a3';
const groups: Record<string, string[]> = {
  prose: ['bench/holdout/gh-prose.txt', 'bench/holdout/readme.txt', 'bench/holdout/license.txt', 'bench/holdout/lic-mit.txt', 'bench/holdout/md-react.txt', 'bench/holdout/md-vite.txt'],
  code: ['bench/holdout/code-ts.txt', 'bench/holdout/code-dts.txt', 'bench/holdout/json-pkg.txt', 'bench/holdout/gh-api.json.txt'],
  ops: fs.readdirSync('bench/holdout-ops').map((f) => path.join('bench/holdout-ops', f)).concat(fs.readdirSync('bench/z20/samples').map((f) => path.join('bench/z20/samples', f))),
  realjson: fs.readdirSync('bench/z25/json-real').map((f) => path.join('bench/z25/json-real', f)),
};
const enc = 'o200k_base' as const;
let files = 0, fail = 0, idT = 0, outT = 0;
for (const [g, fl] of Object.entries(groups)) {
  let gi = 0, go = 0;
  for (const f of fl) {
    const t = fs.readFileSync(f, 'utf8');
    const r = phalanxA3Encode(t, enc);
    const back = phalanxA3Decode(r.wire);
    const ok = back === t;
    if (!ok) fail++;
    files++;
    gi += countTokens(t, enc); go += countTokens(r.wire, enc);
    if (!ok) console.log(`FAIL ${f}`);
  }
  idT += gi; outT += go;
  console.log(`${g}: identity=${gi} A3=${go}`);
}
console.log(`ALL: files=${files} identity=${idT} A3=${outT} (${(((outT - idT) / idT) * 100).toFixed(2)}%) roundtrip failures=${fail}`);
