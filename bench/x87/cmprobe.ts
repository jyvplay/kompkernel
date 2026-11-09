/** X87 — is the repo's own stage-1 CM engine better than brotli on the frontier lanes?
 *  cm.ts ships a full lpaq-class context-mixing coder but is NOT referenced from
 *  registry.ts, so no frontier arm ever uses it. Measure its bit output against
 *  brotli q11 on the same bytes, and report what it would cost at 14.8 bits/token. */
import * as fs from 'node:fs';
import * as zlib from 'node:zlib';
import { cmCompress, cmDecompress } from '../../src/lib/omega/cm';
const lanes = JSON.parse(fs.readFileSync('bench/x80/receipts/frontier.json', 'utf8'));
const F: Record<string, number> = {};
for (const r of lanes.rows) F[r.path.split('/').pop()] = r.messageTokens ?? r.tokens ?? r.F;
const BPT = 14.8;
console.log('lane'.padEnd(24) + 'bytes'.padStart(7) + 'brotli'.padStart(8) + 'cm'.padStart(7) + 'cm/bro'.padStart(8) + 'cmTok'.padStart(7) + 'F'.padStart(6) + 'gain'.padStart(7));
let totCm = 0, totBr = 0, n = 0;
for (const r of lanes.rows) {
  const p = r.path; if (!fs.existsSync(p)) { console.log('missing', p); continue; }
  const b = fs.readFileSync(p);
  const br = zlib.brotliCompressSync(b, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } });
  const t0 = Date.now();
  const cm = cmCompress(b);
  const rt = Buffer.from(cmDecompress(cm)).equals(b);
  const cmTok = Math.ceil(cm.length * 8 / BPT);
  const f = F[p.split('/').pop()];
  totCm += cmTok; totBr += Math.ceil(br.length * 8 / BPT); n++;
  console.log(p.split('/').pop()!.padEnd(24) + String(b.length).padStart(7) + String(br.length).padStart(8) + String(cm.length).padStart(7) +
    (cm.length / br.length).toFixed(3).padStart(8) + String(cmTok).padStart(7) + String(f).padStart(6) + String(f ? f - cmTok : '?').padStart(7) +
    '  rt=' + rt + ' ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
console.log(`\nTOTALS over ${n} lanes: cm tokens ${totCm}  brotli-floor tokens ${totBr}  frontier total ${Object.values(F).reduce((a: number, b: any) => a + b, 0)}`);
