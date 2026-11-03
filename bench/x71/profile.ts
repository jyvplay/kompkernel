import * as fs from 'node:fs';
import { synkrisisEncode } from '../../src/lib/omega/synkrisis';
import { bifrontEncode } from '../../src/lib/omega/bifront';
import { kanonEncode } from '../../src/lib/omega/kanon';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { apographeEncode } from '../../src/lib/omega/apographe';
import { metronEncode } from '../../src/lib/omega/metron';
import { hemeraEncode } from '../../src/lib/omega/hemera';
import { diastemaEncode } from '../../src/lib/omega/diastema';
const enc: any = 'o200k_base';
const F: Array<[string, any]> = [['synkrisis', synkrisisEncode], ['bifront', bifrontEncode], ['kanon', kanonEncode],
  ['akolouthia2', akolouthia2Encode], ['apographe', apographeEncode], ['metron', metronEncode],
  ['hemera', hemeraEncode], ['diastema', diastemaEncode]];
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const parts: string[] = [];
  let total = 0;
  for (const [name, fn] of F) {
    const t0 = Date.now();
    let tok = -1;
    try { const r: any = fn(text, enc); tok = r?.messageTokens ?? r?.promptTokens ?? -1; } catch (e) { tok = -2; }
    const ms = Date.now() - t0; total += ms;
    parts.push(`${name} ${tok}tok ${ms}ms`);
  }
  console.error(`${p}\n  ${parts.join(' | ')}\n  sum ${total}ms`);
}
