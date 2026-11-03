import * as fs from 'node:fs';
import * as path from 'node:path';
import { stichomythiaEncode } from '../../src/lib/omega/stichomythia';
import { readStichomythia } from './reader';
const enc: any = 'o200k_base';
let ok = 0, bad = 0, na = 0;
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const r = stichomythiaEncode(t, enc);
  if (!r.applied) { na++; continue; }
  let out = '';
  try { out = readStichomythia(r.message); } catch (e: any) { console.log(`THROW ${path.basename(p)} ${e.message}`); bad++; continue; }
  if (out === t) { ok++; console.log(`reader-exact ${path.basename(p).padEnd(22)} ${r.messageTokens} tok`); }
  else { bad++; console.log(`MISMATCH ${path.basename(p)} first diff at ${[...t].findIndex((c, i) => c !== out[i])}`); }
}
console.log(`reader: exact ${ok}, mismatch ${bad}, not applied ${na}`);
