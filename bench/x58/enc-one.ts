import * as fs from 'node:fs';
import { zygonEncode } from '../../src/lib/omega/zygon';
const text = fs.readFileSync('bench/x58/redteam/cases/league-points.csv', 'utf8');
const t0 = Date.now();
const r: any = zygonEncode(text, 'o200k_base');
console.log(JSON.stringify({ applied: r.applied, exact: r.exact && r.decoded === text, messageTokens: r.messageTokens, parentTokens: r.parentTokens, parentCodec: r.parentCodec, candidateTokens: r.candidateTokens, comparison: r.comparison, ms: Date.now() - t0 }));
