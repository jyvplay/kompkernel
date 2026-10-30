// X54 smoke: plan-level checks for ATHROISMOS on real lanes.
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { athroismosPlan, athroismosRestore } from '../../src/lib/omega/athroismos';
const ENC = 'o200k_base' as const; const T = (s: string) => countTokens(s, ENC);
function check(name: string, text: string) {
  const p = athroismosPlan(text, ENC);
  if (!p) { console.log(name, 'NO PLAN'); return; }
  const ok = athroismosRestore(p.reducedText, p.spec) === text;
  console.log(name, `PLAN kind=${p.spec.rule.kind} style=${p.spec.style} col=${p.spec.rule.col} exc=${p.spec.rule.exceptions.length} exact=${ok} rawTok=${T(text)} redTok=${T(p.reducedText)} contractTok=${T(p.contract)}`);
  console.log('  contract:', p.contract);
}
check('statement_A', fs.readFileSync('bench/x54/fixtures/statement_A.csv', 'utf8'));
const mai = fs.readFileSync('bench/x54/fixtures/mai-excerpt.csv', 'utf8');
check('mai-excerpt', mai);
// negatives
check('airport-slice', (() => { const l = fs.readFileSync('bench/z48/corpus/airport-codes-300.csv', 'utf8').split('\n'); return l.slice(0, 60).join('\n'); })());
check('prose', 'just some text\nwith lines\nand no table at all here\nreally none\n');
