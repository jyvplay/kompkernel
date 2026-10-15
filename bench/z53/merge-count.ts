// z53: structural count only (no tokenizer): tree length with and without the subtree merge, exactness checked.
import fs from 'node:fs';
import { densWireLines, densExpand } from '@/lib/omega/dendrons';
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  for (const sep of ['.', '/']) {
    const a = densWireLines(text, sep, false).join('\n');
    const b = densWireLines(text, sep, true).join('\n');
    console.log(JSON.stringify({ file: f.split('/').slice(-1)[0], sep, charsPlain: a.length, charsMerged: b.length, exactPlain: densExpand(a) === text, exactMerged: densExpand(b) === text, mergeMarkers: (b.match(/\}\{/g) ?? []).length }));
  }
}
