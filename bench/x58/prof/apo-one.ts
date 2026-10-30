import * as fs from 'node:fs';
import { apographeEncode, apographeDecodeResult } from '../../../src/lib/omega/apographe';
import { countTokens } from '../../../src/lib/omega/bpe';
const lane = process.argv[2]!;
const text = fs.readFileSync(lane, 'utf8');
const t0 = Date.now();
const r: any = apographeEncode(text, 'o200k_base');
const msg = (r.contract ? r.contract + '\n' : '') + r.wire;
console.log(JSON.stringify({ lane, ms: Date.now() - t0, tokens: countTokens(msg, 'o200k_base'), exact: apographeDecodeResult(r) === text, modelled: r.apographeModelled, lifts: (r.apographeLifts || []).length }));
