// Z38: cost of header entry separators, using the real VERITAS-M header entries of a file.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { veritasMEncode } from '@/lib/omega/veritas-m';
import { TERMINATOR } from '@/lib/omega/veritas-u';
import { VXR_LEGEND } from '@/lib/omega/veritas-r';
import { VXR_SENTINEL } from '@/lib/omega/veritas-a';
for (const f of process.argv.slice(2)) {
  const r = veritasMEncode(fs.readFileSync(f, 'utf8'));
  const w = r.wire;
  const start = w.indexOf(VXR_LEGEND) + VXR_LEGEND.length + 1;
  const end = w.indexOf('\n' + TERMINATOR + '\n');
  const lines = w.slice(start, end).split('\n');
  const c = (s: string) => countTokens(s, 'o200k_base');
  const nl = lines.join('\n'), sp = lines.join(' '), none = lines.join('');
  console.log(JSON.stringify({ f: f.split('/').pop(), entries: lines.length, headerNL: c(nl), headerSpace: c(sp), headerNone: c(none), perEntryNLtokens: +((c(nl) - c(none)) / lines.length).toFixed(2) }));
}
