import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { isoskelesPlan, isoskelesRestore } from '../../src/lib/omega/isoskeles';
const ENC = 'o200k_base' as const; const T = (s: string) => countTokens(s, ENC);
function check(name: string, text: string) {
  const p = isoskelesPlan(text, ENC);
  if (!p) { console.log(name, 'NO PLAN'); return; }
  const ok = isoskelesRestore(p.reducedText, p.spec) === text;
  console.log(name, `n=${p.spec.n} header=${p.spec.header} labels=${p.spec.labelCols} pad=${p.spec.trailingPad} diag=${JSON.stringify(p.spec.diagConst)} exc=${p.spec.exceptionPairs} exact=${ok} rawTok=${T(text)} redTok=${T(p.reducedText)} contractTok=${T(p.contract)}`);
  console.log('  contract:', p.contract);
}
check('us31', fs.readFileSync('bench/x56/fixtures/us-cities-distance-matrix.csv', 'utf8'));
check('eu24', fs.readFileSync('bench/x56/fixtures/eu-cities-distance-matrix.csv', 'utf8'));
check('corr14', fs.readFileSync('bench/x56/fixtures/ethiopia-regions-corr-matrix.csv', 'utf8'));
check('goal3-5x5', fs.readFileSync('bench/x56/fixtures/goal3-corr-matrix.csv', 'utf8'));
check('airport60-neg', fs.readFileSync('bench/z48/corpus/airport-codes-300.csv', 'utf8').split('\n').slice(0, 60).join('\n'));
check('ethiopia-neg', fs.readFileSync('bench/x55/fixtures/ethiopia-covid-regions.csv', 'utf8').split('\r\n').slice(0, 18).join('\r\n'));
