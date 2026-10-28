import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { nestRestore, nestTransformCandidates } from '../../src/lib/omega/nest';
const enc: any = 'o200k_base';
const path = process.argv[2] ?? 'bench/holdout-mk/page.html';
const text = fs.readFileSync(path, 'utf8');
const plans = nestTransformCandidates(text, enc, 32);
const rows = plans.map((p, index) => ({ index, element: p.elementName, records: p.records, slots: p.slots,
  depth: p.depth, proxyGain: p.proxyGain, sourceStart: p.sourceStart, sourceEnd: p.sourceEnd,
  transformedTokens: countTokens(p.transformed, enc), macroTokens: countTokens(p.transformed.slice(p.sourceStart,
    p.sourceStart + (p.transformed.length - (text.length - (p.sourceEnd - p.sourceStart)))), enc),
  exact: nestRestore(p.transformed, p.delimiters) === text }));
console.log(JSON.stringify({ path, chars: text.length, sourceTokens: countTokens(text, enc), candidateCount: plans.length, rows }, null, 2));
