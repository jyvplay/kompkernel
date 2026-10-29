// X56: emit payloads (contract line + raw reduced table) for the Python
// from-contract decoder and blind hand decoding. NOT parent-coded.
import * as fs from 'node:fs';
import { isoskelesPlan } from '../../src/lib/omega/isoskeles';
const ENC = 'o200k_base' as const;
fs.mkdirSync('bench/x56/payloads', { recursive: true });
const manifest: { name: string; n?: number }[] = [];
for (const [name, file] of [
  ['us31', 'bench/x56/fixtures/us-cities-distance-matrix.csv'],
  ['eu24', 'bench/x56/fixtures/eu-cities-distance-matrix.csv'],
  ['corr14', 'bench/x56/fixtures/ethiopia-regions-corr-matrix.csv'],
  ['goal3', 'bench/x56/fixtures/goal3-corr-matrix.csv'],
] as const) {
  const text = fs.readFileSync(file, 'utf8');
  const p = isoskelesPlan(text, ENC);
  if (!p) { console.log(name, 'NO PLAN'); manifest.push({ name }); continue; }
  fs.writeFileSync(`bench/x56/payloads/${name}.payload`, p.contract + '\n' + p.reducedText);
  fs.writeFileSync(`bench/x56/payloads/${name}.expected`, text);
  manifest.push({ name, n: p.spec.n });
  console.log(name, 'n=', p.spec.n, 'hdr=', p.spec.header, 'diag=', JSON.stringify(p.spec.diagConst));
}
fs.writeFileSync('bench/x56/payloads/MANIFEST.json', JSON.stringify(manifest, null, 2));
