// Z37: DAEDALUS rule structure on the given files (rule counts, nesting) vs VXR entry counts.
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { veritasREncode } from '@/lib/omega/veritas-r';
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const d = daedalusEncode(text);
  const v = veritasREncode(text);
  console.log(JSON.stringify({ f: f.split('/').pop(), dae: d.messageTokens, daeArm: d.winningArm, phraseRules: d.phraseRules, wordRules: d.wordRules, blocks: d.blocks, lists: d.lists, vxr: v.outTokens, vxrEntries: v.entries }));
}
