import * as fs from 'node:fs';
import { synkrisisEncode } from '../../src/lib/omega/synkrisis';
import { kanonEncode } from '../../src/lib/omega/kanon';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { apographeEncode } from '../../src/lib/omega/apographe';
import { diastemaEncode } from '../../src/lib/omega/diastema';
import { metronEncode } from '../../src/lib/omega/metron';
const text = fs.readFileSync('bench/holdout-x40/metrics.tsv', 'utf8');
const arms: [string, (t: string) => any][] = [
  ['synkrisis', (t) => synkrisisEncode(t, 'o200k_base')],
  ['kanon', (t) => kanonEncode(t, 'o200k_base')],
  ['akolouthia2', (t) => akolouthia2Encode(t, 'o200k_base')],
  ['apographe', (t) => apographeEncode(t, 'o200k_base')],
  ['diastema', (t) => diastemaEncode(t, 'o200k_base')],
  ['metron', (t) => metronEncode(t, 'o200k_base')],
];
for (const [name, fn] of arms) {
  try {
    const s = Date.now(); const r: any = fn(text);
    console.log(JSON.stringify({ arm: name, tokens: r.messageTokens ?? null, ms: Date.now() - s }));
  } catch (e) { console.log(JSON.stringify({ arm: name, error: String(e).slice(0, 120) })); }
}
