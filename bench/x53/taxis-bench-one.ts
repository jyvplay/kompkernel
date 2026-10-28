// X53: one lane through taxisEncode (full gate). Usage: lane
import * as fs from 'node:fs';
import { taxisEncode } from '../../src/lib/omega/taxis';
const lane = process.argv[2]!;
const s = fs.readFileSync(lane, 'utf8');
const r = taxisEncode(s, 'o200k_base');
console.log(JSON.stringify({
  lane, applied: r.applied, exact: r.exact, messageTokens: r.messageTokens,
  parentTokens: r.parentTokens, parentCodec: r.parentCodec, parentCosts: r.parentCosts,
  precheckParentTokens: r.precheckParentTokens, candidateTokens: r.candidateTokens,
  candidateParentCodec: r.candidateParentCodec, candidateParentCosts: r.candidateParentCosts,
  fullFrontierMeasured: r.fullFrontierMeasured, rules: r.rules, rows: r.rows,
  comparison: r.comparison, notes: r.notes, ms: r.ms,
}));
