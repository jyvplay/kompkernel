// Dumps PHALANX-A1 wires (21-file corpus + 400 fuzz texts) for the independent blind decoder (Python).
import fs from 'node:fs';
import path from 'node:path';
import { phalanxA2Encode } from '@/lib/omega/phalanx-a2';
const files = [
  'bench/holdout/gh-prose.txt', 'bench/holdout/readme.txt', 'bench/holdout/license.txt', 'bench/holdout/lic-mit.txt', 'bench/holdout/md-react.txt', 'bench/holdout/md-vite.txt',
  'bench/holdout/code-ts.txt', 'bench/holdout/code-dts.txt', 'bench/holdout/json-pkg.txt', 'bench/holdout/gh-api.json.txt',
  ...fs.readdirSync('bench/holdout-ops').map((f) => path.join('bench/holdout-ops', f)),
  ...fs.readdirSync('bench/z20/samples').map((f) => path.join('bench/z20/samples', f)),
];
const items: { name: string; text: string; wire: string }[] = [];
for (const f of files) { const t = fs.readFileSync(f, 'utf8'); items.push({ name: f, text: t, wire: phalanxA2Encode(t).wire }); }
let seed = 777; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const words = ['a', 'bb', '^', '=', '@1', '&3:', '~a', '~~', '~N', '[[VXA', ']]', '¦', '§', '/usr/lib/x', 'the', 'and', 'cat', '\t', '  ', 'A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6'];
for (let n = 0; n < 400; n++) {
  const lines: string[] = [];
  const L = 1 + Math.floor(rnd() * 14);
  for (let i = 0; i < L; i++) {
    if (lines.length && rnd() < 0.5) { lines.push(lines[Math.floor(rnd() * lines.length)]); continue; }
    const k = 1 + Math.floor(rnd() * 9); const parts: string[] = [];
    for (let j = 0; j < k; j++) parts.push(words[Math.floor(rnd() * words.length)]);
    lines.push(parts.join(rnd() < 0.8 ? ' ' : '\t'));
  }
  const text = lines.join('\n') + (rnd() < 0.2 ? '\n' : '');
  items.push({ name: 'fuzz' + n, text, wire: phalanxA2Encode(text).wire });
}
fs.writeFileSync('/home/user/z20-work/a2-wires.json', JSON.stringify(items));
console.log('dumped', items.length);
