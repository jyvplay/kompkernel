import fs from 'node:fs';
import path from 'node:path';
import { recogniseCanon, formatRef, anagnorisisEncode, anagnorisisDecode, anagnorisisDecoderPrompt } from '../../src/lib/omega/anagnorisis';
import { countTokens } from '../../src/lib/omega/bpe';
const enc = (process.env.ENC || 'o200k_base') as any;
const full = !!process.env.FULL;
let n = 0, hit = 0;
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  n++;
  const found = recogniseCanon(t);
  const desc = found.map(x => formatRef(x.ref).replace(/\n/g, '⏎') + `[${x.end - x.start}ch]`).join(' ');
  if (found.length) hit++;
  if (!full) { console.log(`${path.basename(f).padEnd(44)} ${String(countTokens(t, enc)).padStart(6)} ${desc || '-'}`); continue; }
  const t0 = Date.now();
  const r = anagnorisisEncode(t, enc);
  const ok = anagnorisisDecode(r.wire) === t && anagnorisisDecoderPrompt(r.wire) === r.decoderPrompt;
  console.log(`${path.basename(f).padEnd(44)} raw=${r.inTokens} plainM=${r.plainMessageTokens} M=${r.messageTokens} applied=${r.canonApplied} exact=${r.exact} decodeOk=${ok} ${desc} ms=${Date.now() - t0}`);
}
console.log(`files=${n} recognised=${hit}`);
