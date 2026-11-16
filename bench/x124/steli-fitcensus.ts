/** Fit-only census over the 29 lanes: no parent encode, so it runs in seconds. */
import * as fs from 'node:fs';
import { steliFit, steliTransform, steliUndo, steliCheapestMarker } from '../../src/lib/omega/steli';
import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
const all = fs.readFileSync('bench/x109/lanes29.txt', 'utf8').split('\n').filter(Boolean);
let fits = 0, pad = 0;
for (const p of all) {
  const src = fs.readFileSync(p, 'utf8');
  const blk = steliFit(src.split('\n'));
  if (!blk) { console.log(`${p.padEnd(42)} no fit`); continue; }
  fits++; pad += blk.padMass;
  const tr = steliTransform(src)!;
  const c = steliCheapestMarker(tr.marker, tr.offsets, tr.rows, tr.split, enc);
  console.log(`${p.padEnd(42)} fit ${blk.rows}x${blk.offsets.length} off ${blk.offsets.join(',').padEnd(28)} pad ${String(blk.padMass).padStart(5)} split ${blk.split} undo ${steliUndo(tr.text) === src ? 'y' : 'n'} contract ${countTokens(c + '\n', enc)}`);
}
console.log(`census: ${fits}/${all.length} fit, Σ pad ${pad}`);
