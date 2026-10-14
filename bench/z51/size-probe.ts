import fs from 'node:fs';
import { denEncode } from '@/lib/omega/dendron';
const all = fs.readFileSync('bench/z51/corpus/git-ls-files-400.txt', 'utf8');
for (const n of [24, 40, 80, 160]) {
  const t = all.split('\n').slice(0, n).join('\n') + '\n';
  const r = denEncode(t, 'o200k_base', {});
  console.log(JSON.stringify({ n, frontier: r.frontierM, dendron: r.messageTokens, delta: r.messageTokens - r.frontierM, applied: r.applied, treeLines: r.treeLines, notes: r.notes.slice(0, 80) }));
}
