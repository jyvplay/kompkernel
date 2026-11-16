import * as fs from 'node:fs';
import { platosFit } from '../../src/lib/omega/platos';
const t = fs.readFileSync('bench/holdout-x42/findmnt.txt', 'utf8');
const lines = t.split('\n');
console.log('lines', lines.length, JSON.stringify(lines[0]), JSON.stringify(lines[lines.length - 1]));
console.log('fit all:', JSON.stringify(platosFit(lines)?.side ?? null), platosFit(lines)?.rows.length ?? 0);
for (let a = 0; a < 3; a++) {
  const sub = lines.slice(a);
  const f = platosFit(sub);
  console.log('drop first', a, '->', f ? `${f.rows.length}x${f.n ?? (f as any).side.length} side ${f.side} pad ${f.padMass}` : 'NO FIT');
}
for (let b = 1; b <= 2; b++) {
  const sub = lines.slice(0, lines.length - b);
  const f = platosFit(sub);
  console.log('drop last', b, '->', f ? `${f.rows.length} side ${f.side} pad ${f.padMass}` : 'NO FIT');
}
const noComment = lines.filter((l, i) => i !== 0);
const f2 = platosFit(noComment);
console.log('no comment line ->', f2 ? `${f2.rows.length} side ${f2.side} pad ${f2.padMass}` : 'NO FIT');
const dataOnly = lines.slice(1, 27);
const f3 = platosFit(dataOnly);
console.log('data only (26) ->', f3 ? `${f3.rows.length} side ${f3.side} pad ${f3.padMass}` : 'NO FIT');
const dataNoHdr = lines.slice(2, 27);
const f4 = platosFit(dataNoHdr);
console.log('data no header (25) ->', f4 ? `${f4.rows.length} side ${f4.side} pad ${f4.padMass}` : 'NO FIT');
