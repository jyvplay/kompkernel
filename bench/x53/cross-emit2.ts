// X53: emit (contract, reduced, orig) triples for DIPTYCHON-variant lanes.
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { diptychonPlan } from '../../src/lib/omega/diptychon';
const ENC = 'o200k_base' as const;
fs.mkdirSync('bench/x53/tmp-cross2', { recursive: true });
const cases: Array<[string, string]> = [
  ['od-x1', fs.readFileSync('bench/x53/fixtures2/od-x1nogutter.txt', 'utf8')],
  ['od-x2', fs.readFileSync('bench/x53/fixtures2/od-x2.txt', 'utf8')],
  ['carray', fs.readFileSync('bench/x53/fixtures2/xcc-array.txt', 'utf8')],
  ['od-x1-squeeze', execSync('od -A x -t x1 /tmp/dip2zeros.bin', { encoding: 'utf8' })],
  ['od-x1-noaddr-short', execSync('od -A n -t x1 /tmp/dip2odd.bin', { encoding: 'utf8' })],
];
for (const [name, text] of cases) {
  const p = diptychonPlan(text, ENC);
  if (!p) { console.log(name, 'NO PLAN'); continue; }
  fs.writeFileSync(`bench/x53/tmp-cross2/${name}.contract`, p.contract + '\n');
  fs.writeFileSync(`bench/x53/tmp-cross2/${name}.reduced`, p.reducedText);
  fs.writeFileSync(`bench/x53/tmp-cross2/${name}.orig`, text);
  console.log(name, 'emitted fmt=' + p.spec.format + ' compact=' + p.spec.compact);
}
