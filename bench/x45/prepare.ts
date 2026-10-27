import * as fs from 'node:fs';
import { synkrisisEncode } from '@/lib/omega/synkrisis';

fs.mkdirSync('bench/x45/receipts/messages', { recursive: true });
const cases = [
  ['django', 'bench/z45/corpus/licenses/django_django.txt'],
  ['bundle', 'bench/x44/lanes/third-party-notices.txt'],
];
for (const [name, path] of cases) {
  const source = fs.readFileSync(path, 'utf8');
  const result = synkrisisEncode(source, 'o200k_base');
  if (!result.applied || result.decoded !== source) throw new Error(`${name}: expected exact SYNKRISIS candidate, got ${result.arm}`);
  fs.writeFileSync(`bench/x45/receipts/messages/${name}.txt`, result.message);
  console.log(`${name}: ${result.arm} M=${result.messageTokens} parent=${result.parentTokens} exact=${result.decoded === source}`);
}
