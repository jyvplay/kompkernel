/** X76 / t10 — does detection fire, and what does the declaration cost? (No frontier.) */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { platosDetect, platosDeclaration, platosMarker, platosTransform, platosUntransform } from '../../src/lib/omega/platos';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const cols = platosDetect(t.split('\n'));
  if (!cols) { console.log(`${p.split('/').pop()!.padEnd(22)} NO LAYOUT`); continue; }
  const marker = platosMarker(t);
  const tr = platosTransform(t, cols, marker);
  const decl = platosDeclaration(cols, marker);
  const ok = tr ? platosUntransform(tr.squeezed, cols, marker) === t : false;
  console.log(`${p.split('/').pop()!.padEnd(22)} cols ${String(cols.length).padStart(2)} decl ${String(T(decl, enc)).padStart(3)} tok removed ${String(tr?.removed ?? 0).padStart(4)} verbatim ${String(tr?.verbatim ?? 0).padStart(3)} restore ${ok} :: ${decl}`);
}
