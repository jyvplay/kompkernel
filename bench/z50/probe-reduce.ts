// z50: unit probe of the SYNARTESIS pre-pass (no DAEDALUS): elided count, restore exactness, timing.
import fs from 'node:fs';
import { synReduce, synRestore } from '@/lib/omega/synartesis';
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = synReduce(text);
  const dt = Date.now() - t0;
  if (!r) { console.log(JSON.stringify({ f, eligible: false })); continue; }
  const back = synRestore(r.reduced);
  console.log(JSON.stringify({ f, eligible: true, elided: r.elided, bytesIn: text.length, bytesReduced: r.reduced.length, restoreExact: back === text, ms: dt }));
}
