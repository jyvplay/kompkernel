import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
const enc: any = 'o200k_base';
const rows: any[] = [];
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const raw = countTokens(t, enc);
  const t0 = Date.now();
  const a = apographeEncode(t, enc);
  const ap = countTokens((a.contract ? a.contract + '\n' : '') + a.wire, enc);
  const al = akolouthia2Encode(t, enc);
  const ak = countTokens(al.decoderPrompt, enc);
  const best = Math.min(ap, ak);
  const r = { f, chars: t.length, raw, ap, ak, best, gainPct: +(((raw - best) / raw) * 100).toFixed(1), ok: apographeDecodeResult(a) === t, ms: Date.now() - t0 };
  rows.push(r);
  process.stderr.write(JSON.stringify(r) + '\n');
}
rows.sort((x, y) => x.gainPct - y.gainPct);
process.stderr.write('LOWEST GAIN\n');
for (const r of rows.slice(0, 25)) process.stderr.write(JSON.stringify(r) + '\n');
