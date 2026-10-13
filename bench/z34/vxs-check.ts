// Z34: VERITAS-S on files: one-chat wire tokens, entries, exact round trip (decode of the emitted wire).
import fs from 'node:fs';
import { veritasSEncode } from '@/lib/omega/veritas-s';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const r = veritasSEncode(t);
  console.log(JSON.stringify({ file: f, in: r.inTokens, out: r.outTokens, entries: r.entries, exact: r.exact }));
}
