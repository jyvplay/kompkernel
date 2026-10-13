// Z44: emit every session's wires as JSONL so the independent CPython reader can
// decode them in a separate process and be diffed against the sources.
import fs from 'node:fs';
import path from 'node:path';
import { buildSessions } from './sessions';
import { anamnesisEncodeSession } from '@/lib/omega/anamnesis';

const OUT = process.env.OUT ?? 'bench/tmp/z44/sessions';
fs.mkdirSync(OUT, { recursive: true });
const only = (process.env.ONLY ?? '').split(',').filter(Boolean);
let allExact = true;
for (const s of buildSessions()) {
  if (only.length && !only.includes(s.name)) continue;
  const dir = path.join(OUT, s.name);
  fs.mkdirSync(dir, { recursive: true });
  const r = anamnesisEncodeSession(s.messages, 'o200k_base');
  const lines = r.messages.map(m => JSON.stringify({ wire: m.wire }));
  fs.writeFileSync(path.join(dir, 'wires.jsonl'), lines.join('\n') + '\n');
  s.messages.forEach((t, i) => fs.writeFileSync(path.join(dir, `src_${String(i).padStart(2, '0')}.txt`), t));
  if (!r.exactAll) allExact = false;
  console.log(`${s.name}: ${r.messages.length} wires written (encoder-side exact=${r.exactAll})`);
}
console.log(allExact ? 'ALL ENCODER-SIDE EXACT' : 'ENCODER-SIDE FAILURE');
