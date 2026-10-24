/** X41 TYPOS — plan census: mask, header, proxy gain, and the encoder's own
 *  self-decode check (which is the codec's soundness gate, so it is the first
 *  thing a bench must show). */
import * as fs from 'node:fs';
import { typosPlan, typosDecode, typosTransform } from '@/lib/omega/typos';
import { countTokens } from '@/lib/omega/bpe';
const enc: any = 'o200k_base';
for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const pl: any = typosPlan(t, enc);
  const raw = countTokens(t, enc);
  if (!pl) { console.log(p.split('/').pop()!.padEnd(22), 'raw=' + raw, 'no plan', ((Date.now() - t0) / 1000).toFixed(1) + 's'); continue; }
  const x = typosTransform(t, pl);
  const dec = typosDecode(x);
  console.log(p.split('/').pop()!.padEnd(22), 'raw=' + String(raw).padStart(5),
    'xform=' + String(countTokens(x, enc)).padStart(5),
    'gain=' + String(pl.proxyGain).padStart(5),
    'rows=' + pl.rowCount, 'lit=' + pl.literalCount, 'slots=' + (pl.lits.length - 1),
    'models=' + (pl.models.size || 0),
    'decode=' + (dec === t ? 'EXACT' : '***MISMATCH***'), ((Date.now() - t0) / 1000).toFixed(1) + 's');
  console.log('    hdr:', JSON.stringify(pl.header).slice(0, 260));
  if (dec !== t) {
    for (let i = 0; i < Math.max(dec.length, t.length); i++) {
      if (dec[i] !== t[i]) { console.log('   diff @' + i, JSON.stringify(t.slice(i - 40, i + 60)), '|got|', JSON.stringify(dec.slice(i - 40, i + 60))); break; }
    }
  }
}
