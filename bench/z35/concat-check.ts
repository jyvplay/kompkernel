// Z35: does concatenating tokenStrings() reproduce escBody(text) exactly? Counts tokens whose string is lossy.
import fs from 'node:fs';
import { tokenStrings } from '@/lib/omega/bpe';
import { escBody } from '@/lib/omega/veritas-a';
for (const f of process.argv.slice(2)) {
  const t = escBody(fs.readFileSync(f, 'utf8'));
  const toks = tokenStrings(t, 'o200k_base');
  const joined = toks.map((x) => x.s).join('');
  let k = 0; while (k < t.length && t[k] === joined[k]) k++;
  const bad = toks.filter((x) => x.s.includes('\uFFFD')).length;
  console.log(JSON.stringify({ file: f.split('/').pop(), equal: joined === t, firstDiff: k, lenText: t.length, lenJoined: joined.length, replacementCharTokens: bad }));
}
