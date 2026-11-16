import * as fs from 'node:fs';
import { platosFit, platosTransform, platosRebuildRow, undo } from '../../src/lib/omega/platos';

const lanes = fs.readFileSync('bench/x109/lanes29.txt', 'utf8').split('\n').filter(Boolean);
let tot = 0;
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(eol);
  const blk = platosFit(lines);
  if (!blk) { console.log(`${p.split('/').pop()!.padEnd(26)} no fit`); continue; }
  const tr = platosTransform(text);
  const ok = tr ? undo(tr.text) === text : false;
  tot += blk.padMass;
  console.log(`${p.split('/').pop()!.padEnd(26)} rows=${String(blk.rows.length).padStart(4)} cols=${blk.n} pad=${String(blk.padMass).padStart(5)} side=${blk.side} undo=${ok}`);
}
console.log('Σ padMass', tot);
