// X53: emit (contract, reduced, orig) triples for Python cross-decode.
import * as fs from 'node:fs';
import { taxisPlan } from '../../src/lib/omega/taxis';
const lanes = [
  'bench/x53/fixtures/ps-aux-190.txt',
  'bench/x53/fixtures/ps-bigmem.txt',
  'bench/x53/fixtures/top.txt',
  'bench/z48/corpus/ps-aux-sandbox.txt',
  'bench/z57/lanes/ops-ps-aux.txt',
  'bench/holdout-x41/ps-aux-real.txt',
];
fs.mkdirSync('bench/x53/tmp-cross', { recursive: true });
for (const f of lanes) {
  const s = fs.readFileSync(f, 'utf8');
  const p = taxisPlan(s);
  const base = 'bench/x53/tmp-cross/' + f.split('/').pop()!.replace(/\W+/g, '_');
  if (!p) { console.log(f, 'NO PLAN'); continue; }
  fs.writeFileSync(base + '.contract', p.contract + '\n');
  fs.writeFileSync(base + '.reduced', p.reducedText);
  fs.writeFileSync(base + '.orig', s);
  console.log(f, 'emitted');
}
