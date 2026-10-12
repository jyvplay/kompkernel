// Z35: export the o200k token strings of the escaped body (the same segmentation the codec counts) as JSON lines.
import fs from 'node:fs';
import { tokenStrings } from '@/lib/omega/bpe';
import { escBody } from '@/lib/omega/veritas-a';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const toks = tokenStrings(escBody(t), 'o200k_base').map((x) => x.s);
  process.stdout.write(JSON.stringify({ file: f, toks }) + '\n');
}
