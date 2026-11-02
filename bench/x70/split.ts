import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { apographeEncode } from '../../src/lib/omega/apographe';
import { kanonEncode } from '../../src/lib/omega/kanon';
import { synkrisisEncode } from '../../src/lib/omega/synkrisis';
import { metronEncode } from '../../src/lib/omega/metron';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { diastemaEncode } from '../../src/lib/omega/diastema';

const enc: any = 'o200k_base';
const C = (s: string) => countTokens(s, enc);
const codecs: Record<string, (t: string, e: any) => any> = {
  apographe: apographeEncode, kanon: kanonEncode, synkrisis: synkrisisEncode,
  metron: metronEncode, akolouthia2: akolouthia2Encode, diastema: diastemaEncode,
};
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  console.log('==== ' + p + ' raw=' + C(text));
  for (const [name, fn] of Object.entries(codecs)) {
    let r: any;
    try { r = fn(text, enc); } catch (e) { console.log(name, 'ERR', String(e).slice(0,80)); continue; }
    const con: string = r.contract ?? '';
    const wire: string = r.wire ?? '';
    console.log(`  ${name.padEnd(12)} M=${String(r.messageTokens).padStart(4)} contract=${String(C(con)).padStart(3)} wireTok=${String(C(wire)).padStart(4)} wireCh=${String(wire.length).padStart(5)} exact=${r.decoded === text}`);
  }
}
