import * as fs from 'node:fs';
import { bathmosEncode } from '../../src/lib/omega/bathmos';
const text = fs.readFileSync('bench/x59/redteam/cases/shuffled.csv', 'utf8');
const s = Date.now();
const r: any = bathmosEncode(text, 'o200k_base');
console.log(JSON.stringify({ ms: Date.now() - s, applied: r.applied, exact: r.exact && r.decoded === text, messageTokens: r.messageTokens, parentCodec: r.parentCodec, parentTokens: r.parentTokens, candidateTokens: r.candidateTokens, candidateExact: r.candidateExact, comparison: r.comparison, fullFrontierMeasured: r.fullFrontierMeasured, notes: r.notes }, null, 1));
