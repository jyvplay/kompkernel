import * as fs from 'node:fs';
import { steliTransform, steliUndo, steliRebuildRow, sliceRow } from '../../src/lib/omega/steli';
const src = fs.readFileSync('bench/holdout-x41/ls-l-real.txt', 'utf8');
const tr = steliTransform(src);
console.log('steliTransform ls-l:', tr ? { rows: tr.rows, offsets: tr.offsets, pad: tr.padMass } : 'NULL');
if (tr) console.log('undo exact:', steliUndo(tr.text) === src, '\n' + tr.text.slice(0, 300));
// where do runs break?
const lines = src.split('\n');
const re = /\S+/g;
let run = 0, breaks: string[] = [];
const endsOf = (l: string): number[] | null => {
  const pos: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(l))) pos.push(m.index + m[0].length);
  return pos;
};
const probe = endsOf(lines[3]!);
let prev: number[] | null = null;
for (const l of lines) {
  const e = l.trim() ? endsOf(l) : null;
  const same = e && prev && e.length === prev.length && e.every((x, i) => x === prev![i]);
  if (!same) breaks.push(l.slice(0, 60));
  prev = e ?? null;
}
console.log('edge-signature breaks:', breaks.length, breaks.slice(0, 6));
