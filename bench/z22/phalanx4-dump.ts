// Dumps P4 wires for the blind (independent, legend-only) decoder check.
import fs from 'node:fs';
import path from 'node:path';
import { phalanx4Encode } from './experiments/phalanx4';
const dirs = ['bench/holdout-ops', 'bench/holdout', 'bench/z20/samples'];
const items: { name: string; text: string }[] = [];
for (const d of dirs) for (const f of fs.readdirSync(d)) {
  const p = path.join(d, f); if (fs.statSync(p).isFile()) items.push({ name: p, text: fs.readFileSync(p, 'utf8') });
}
let seed = 77;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const words = ['a', 'bb', '^', '^^', '=', '@1', '@:x', '&3:', '&:q', '~a', '~~', '~N', '[[VX1', ']]', 'PHALANX-P4', '/usr/lib/x', '/usr/lib/y',
  'A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6', '3f2a9c1e-7b4d-4e8a-9c2f-1a2b3c4d5e6f', 'the', 'and', '\t'];
for (let n = 0; n < 400; n++) {
  const lines: string[] = [];
  const L = 1 + Math.floor(rnd() * 12);
  for (let i = 0; i < L; i++) {
    if (lines.length && rnd() < 0.5) { lines.push(lines[Math.floor(rnd() * lines.length)]); continue; }
    const k = 1 + Math.floor(rnd() * 7); const parts: string[] = [];
    for (let j = 0; j < k; j++) parts.push(words[Math.floor(rnd() * words.length)]);
    lines.push(parts.join(rnd() < 0.8 ? ' ' : '\t'));
  }
  items.push({ name: 'fuzz' + n, text: lines.join('\n') });
}
const out = items.map((it) => ({ name: it.name, text: it.text, wire: phalanx4Encode(it.text).wire }));
fs.writeFileSync('/home/user/z20-work/p4-wires.json', JSON.stringify(out));
console.log('dumped', out.length);
