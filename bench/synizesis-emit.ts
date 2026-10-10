/** emit SYNIZESIS wires + sources for the independent CPython decoder */
import fs from 'node:fs';
import path from 'node:path';
import { synPlan, renderSynWire, synizesisDecode } from '../src/lib/omega/synizesis';
import { allFixtures } from './synizesis-fixtures';
const out = process.argv[2] ?? 'bench/tmp/synx';
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) fs.rmSync(path.join(out, f));
let n = 0;
for (const f of allFixtures()) {
  const p = synPlan(f.text, 'o200k_base');
  if (!p) continue;
  const w = renderSynWire(p);
  if (synizesisDecode(w) !== f.text) { console.error('TS decoder mismatch on ' + f.name); process.exit(1); }
  const base = path.join(out, f.name.replace(/[^a-zA-Z0-9]+/g, '_'));
  fs.writeFileSync(base + '.wire', w);
  fs.writeFileSync(base + '.src', f.text);
  n++;
}
console.log('emitted ' + n + ' wire/src pairs to ' + out);
