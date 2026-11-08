/** X82 DISCOVERY. Instead of guessing which intra-token separator to delete, ENUMERATE.
 *  Candidate token = maximal run of [A-Za-z0-9] plus one separator char.
 *  Shape = the sequence of (class,length) groups, e.g. 2026-01-01 -> D4-D2-D2.
 *  Deleting the separator is reversible iff the shape is CONSTANT across all instances
 *  (then re-insertion offsets are fixed). Enumerate every (separator,shape) group with
 *  >= MIN members and report the RAW token saving. Cheap: no frontier calls. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const SEPS = ['-', ':', '.', '/', '_', ','];
const MIN = 6;
const cls = (c: string) => (/\d/.test(c) ? 'D' : 'L');

for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const n = p.split('/').pop()!;
  const found: string[] = [];
  for (const sep of SEPS) {
    const re = new RegExp(`[A-Za-z0-9]+(?:\\${sep}[A-Za-z0-9]+)+`, 'g');
    const toks = S.match(re) ?? [];
    const byShape = new Map<string, string[]>();
    for (const t of toks) {
      if (!t.includes(sep)) continue;
      const groups = t.split(sep);
      if (groups.some(g => !/^[A-Za-z0-9]+$/.test(g) || g === '')) continue;
      const shape = groups.map(g => { let s = cls(g[0]); let k = 0; for (const c of g) { const cc = cls(c); if (cc !== s) { s += cc; } } return s + g.length; }).join(sep);
      if (!byShape.has(shape)) byShape.set(shape, []);
      byShape.get(shape)!.push(t);
    }
    for (const [shape, group] of byShape) {
      if (group.length < MIN) continue;
      // G1: after deleting the separator, could the packed form collide with other text?
      const packed = [...new Set(group)].map(g => g.split(sep).join(''));
      const rest = S;
      let collisions = 0;
      for (const pk of packed) {
        const esc = pk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re2 = new RegExp(`(?<![A-Za-z0-9])${esc}(?![A-Za-z0-9])`, 'g');
        collisions += (rest.match(re2) ?? []).length;
      }
      const sample = group[0];
      const before = countTokens(group.join(' '), enc);
      const after = countTokens(group.map(g => g.split(sep).join('')).join(' '), enc);
      found.push(`    sep '${sep}' shape ${shape.padEnd(22)} n=${String(group.length).padStart(4)} e.g. ${sample.padEnd(24)} rawΔ ${String(after - before).padStart(5)} (${((before - after) / group.length).toFixed(2)}/tok) collisions=${collisions}`);
    }
  }
  if (found.length) { console.log(`\n### ${n}`); console.log(found.join('\n')); }
}
