import * as fs from 'node:fs';
import { daedalusEncode } from '../../../src/lib/omega/daedalus';
import { synkrisisEncode } from '../../../src/lib/omega/synkrisis';
import { apographeEncode } from '../../../src/lib/omega/apographe';
const [codec, lane] = process.argv.slice(2) as [string, string];
const text = fs.readFileSync(lane, 'utf8');
const t0 = Date.now();
const r: any = codec === 'daedalus' ? daedalusEncode(text, 'o200k_base')
  : codec === 'synkrisis' ? synkrisisEncode(text, 'o200k_base') : apographeEncode(text, 'o200k_base');
console.log(JSON.stringify({ codec, lane, ms: Date.now() - t0, tokens: r.messageTokens, chironUnits: (globalThis as any).__CHUNITS || 0 }));
