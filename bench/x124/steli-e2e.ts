import * as fs from 'node:fs';
import { steliEncode, steliTransform, steliUndo, steliMarkerLine } from '../../src/lib/omega/steli';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
const all = fs.readFileSync('bench/x109/lanes29.txt', 'utf8').split('\n').filter(Boolean);
const ORDER = process.env.LANES ? process.env.LANES.split(',') : null;
const list: string[] = ORDER ? all.filter((p) => ORDER.includes(p.split('/').pop()!)) : all;
for (const p of list) {
  const src = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const inc = countTokens(tagstackEncode(src, enc).message, enc);
  const r = steliEncode(src, enc, { incumbent: inc });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`${p.split('/').pop()!.padEnd(28)} inc ${String(inc).padStart(5)} -> ${String(r.messageTokens).padStart(5)}  Δ ${String(r.messageTokens - inc).padStart(5)}  exact ${r.exact}  [${dt}s] ${r.notes}`);
  fs.appendFileSync('bench/x124/receipts-steli-e2e.log', `${p.split('/').pop()!.padEnd(28)} inc ${String(inc).padStart(5)} -> ${String(r.messageTokens).padStart(5)}  Δ ${String(r.messageTokens - inc).padStart(5)}  exact ${r.exact}  ${r.notes}\n`);
}
