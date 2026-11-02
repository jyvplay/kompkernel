/** Why BRACHYS falls back: does HYLE even offer a table block on this lane? */
import * as fs from 'node:fs';
import { tableHits, hyleEncode, hyleProbe } from '../../src/lib/omega/hyle';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  let hits: any[] = [];
  try { hits = tableHits(text); } catch { hits = []; }
  const h: any = hyleEncode(text, enc, { fast: true });
  const offered = h.wire.startsWith('¦');
  console.log(JSON.stringify({
    p, raw: countTokens(text, enc), blocks: hits.length,
    topBlock: hits.length ? { lines: `${hits[0].spec.start}-${hits[0].spec.end}`, sep: hits[0].spec.sepRepr, fields: hits[0].spec.nFields } : null,
    hyleOfferedFold: offered, hyleM: h.messageTokens, probe: hyleProbe(text),
  }));
}
