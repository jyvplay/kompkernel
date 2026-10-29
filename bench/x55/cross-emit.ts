// X55: emit payloads (contract line + raw reduced table) for the Python
// from-contract decoder and blind hand decoding. Payloads NOT parent-coded.
import * as fs from 'node:fs';
import { kephalaionPlan } from '../../src/lib/omega/kephalaion';
const ENC = 'o200k_base' as const;
fs.mkdirSync('bench/x55/payloads', { recursive: true });
const manifest: { name: string; rows?: number }[] = [];

const eth = fs.readFileSync('bench/x55/fixtures/ethiopia-covid-regions.csv', 'utf8').split('\n').slice(0, 31).join('\n');
const state = fs.readFileSync('bench/x55/fixtures/state_wise.csv', 'utf8');
const acad = fs.readFileSync('bench/x55/fixtures/academic-performance.csv', 'utf8');
const both = [
  'city,q1,q2,q3,year',
  'aa,10,20,30,60', 'bb,5,7,9,21', 'cc,1,2,3,6', 'dd,11,,4,15',
  'ee,3,3,3,9', 'ff,8,1,6,15', 'gg,2,5,7,14', 'hh,9,9,9,27',
  'Total,49,52,66,167',
].join('\n') + '\n';
const de = [
  'Artikel;Jan;Feb;Mrz;Jahr',
  'a;1.000,50;2.000,25;3,10;3.003,85',
  'b;10,00;20,50;30,25;60,75',
  'c;5,05;;15,15;20,20',
  'd;100,10;200,20;300,30;600,60',
  'e;7,00;8,00;9,00;24,00',
  'f;11,11;22,22;33,33;66,66',
].join('\n') + '\n';
for (const [name, text] of [['ethiopia30', eth], ['statewise', state], ['acad', acad], ['both', both], ['de', de]] as const) {
  const p = kephalaionPlan(text, ENC);
  if (!p) { console.log(name, 'NO PLAN'); manifest.push({ name }); continue; }
  fs.writeFileSync(`bench/x55/payloads/${name}.payload`, p.contract + '\n' + p.reducedText);
  fs.writeFileSync(`bench/x55/payloads/${name}.expected`, text);
  const rows = text.split('\n').length - 2;
  manifest.push({ name, rows });
  console.log(name, 'rowsum=', !!p.spec.rowsum, 'colsum=', !!p.spec.colsum, '|', p.contract.slice(0, 130) + '...');
}
fs.writeFileSync('bench/x55/payloads/MANIFEST.json', JSON.stringify(manifest, null, 2));
