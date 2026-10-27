import * as fs from 'node:fs';
import { codecEntries, measure } from '@/lib/omega/registry';
import { countTokens } from '@/lib/omega/bpe';

const entry = codecEntries().find(e => e.key === 'synkrisis');
if (!entry) throw new Error('synkrisis missing from codec registry');
for (const [name, path] of [
  ['django', 'bench/z45/corpus/licenses/django_django.txt'],
  ['bundle', 'bench/x44/lanes/third-party-notices.txt'],
] as const) {
  const text = fs.readFileSync(path, 'utf8');
  const result = await measure(entry, text, 'o200k_base', countTokens(text, 'o200k_base'));
  console.log(`${name}: key=${result.key} exact=${result.exact} oneChat=${result.oneChatTokens} outputTokens=${result.outTokens} note=${result.note}`);
  if (result.exact !== true || result.oneChatTokens == null) throw new Error(`${name}: registry audit failed`);
}
