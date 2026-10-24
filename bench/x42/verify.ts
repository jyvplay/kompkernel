/** X42 KANNABOS — real encode gate: parent vs KANNABOS, one process, same clock.
 *  Prints the wire decode check as well, because a gate that measures a wire it
 *  cannot decode is measuring nothing. */
import * as fs from 'node:fs';
import { kannabosEncode, kannabosDecode } from '@/lib/omega/kannabos';
import { apographeDecodeResult } from '@/lib/omega/apographe';
import { ouraEncode } from '@/lib/omega/oura';
import { countTokens } from '@/lib/omega/bpe';
const ENC: any = 'o200k_base';
for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) { console.log('MISSING', p); continue; }
  const t = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const f: any = ouraEncode(t, ENC);
  const tf = Date.now();
  const r: any = kannabosEncode(t, ENC);
  const tk = Date.now();
  // Two round-trip checks. (a) the codec's own end-to-end path, inside the
  // encoder, which uses the parent's real decoder options and is the gate that
  // decided to fire; (b) this harness's attempt with the options it can see,
  // which is reported separately because a wire whose parent used a SHAPE needs
  // `ouraShape`/`ouraMode` to be undone and the harness does not carry them.
  // Independent check: the result's own wire, run through the STACK's decoder
  // with the parent options the result carries, then through the grid. This is
  // the path a receiving model's tool would take; the encoder's internal copy of
  // the round trip (r.decoded) is not evidence for it.
  let back2 = '';
  try {
    // The parent may be IDENTITY on the grid wire (it often is: the wire is
    // already dense), so `mid === r.wire` is normal and must not short-circuit.
    back2 = kannabosDecode(apographeDecodeResult(r as any)) === t ? 'EXACT' : 'no';
  } catch (e: any) { back2 = 'threw'; }
  const delta = r.messageTokens - f.messageTokens;
  console.log(p.split('/').pop()!.padEnd(20),
    'raw=' + String(countTokens(t, ENC)).padStart(5),
    'frontier=' + String(f.messageTokens).padStart(5),
    'kannabos=' + String(r.messageTokens).padStart(5),
    'd=' + String(delta).padStart(6),
    'pct=' + (100 * delta / f.messageTokens).toFixed(1).padStart(6),
    'fired=' + (r.kannabos ? 'Y' : 'n'),
    'rt=' + back2,
    ((tk - tf) / 1000).toFixed(0) + 's/' + ((tf - t0) / 1000).toFixed(0) + 's');
  if (r.kannabos) console.log('   hdr:', JSON.stringify(r.kannabosHeader).slice(0, 200));
  else console.log('   note:', r.notes);
}
