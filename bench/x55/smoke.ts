import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { kephalaionPlan, kephalaionRestore } from '../../src/lib/omega/kephalaion';
const ENC = 'o200k_base' as const; const T = (s: string) => countTokens(s, ENC);
function check(name: string, text: string) {
  const p = kephalaionPlan(text, ENC);
  if (!p) { console.log(name, 'NO PLAN'); return; }
  const ok = kephalaionRestore(p.reducedText, p.spec) === text;
  console.log(name, `PLAN rowsum=${p.spec.rowsum ? `col${p.spec.rowsum.col} terms[${p.spec.rowsum.terms}] head=${p.spec.rowsum.head} exc=${p.spec.rowsum.exceptions.length}` : '-'} colsum=${p.spec.colsum ? `row${p.spec.colsum.row} cols[${p.spec.colsum.cols}]` : '-'} exact=${ok} rawTok=${T(text)} redTok=${T(p.reducedText)} contractTok=${T(p.contract)}`);
  console.log('  contract:', p.contract);
}
check('ethiopia', fs.readFileSync('bench/x55/fixtures/ethiopia-covid-regions.csv', 'utf8'));
check('statewise', fs.readFileSync('bench/x55/fixtures/state_wise.csv', 'utf8'));
check('acad', fs.readFileSync('bench/x55/fixtures/academic-performance.csv', 'utf8'));
check('airport60', fs.readFileSync('bench/z48/corpus/airport-codes-300.csv', 'utf8').split('\n').slice(0, 60).join('\n'));
check('statementA-should-not-rowsum', fs.readFileSync('bench/x54/fixtures/statement_A.csv', 'utf8'));
