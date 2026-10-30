import * as fs from 'node:fs';
import { eirmosEncode } from '../../src/lib/omega/eirmos';
const text = fs.readFileSync('bench/x60/fixtures/clients.csv', 'utf8');
const s = Date.now();
const r: any = eirmosEncode(text, 'o200k_base');
console.log(JSON.stringify({ ms: Date.now() - s, applied: r.applied, exact: r.exact && r.decoded === text, messageTokens: r.messageTokens, parentCodec: r.parentCodec, parentTokens: r.parentTokens, candidateTokens: r.candidateTokens, candidateExact: r.candidateExact, comparison: r.comparison, fullFrontierMeasured: r.fullFrontierMeasured, notes: r.notes }, null, 1));
