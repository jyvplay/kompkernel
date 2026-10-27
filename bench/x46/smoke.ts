import * as fs from 'node:fs';
import { codecEntries, measure } from '@/lib/omega/registry';
import { countTokens } from '@/lib/omega/bpe';
const entry = codecEntries().find(e => e.key === 'bifront');
if (!entry) throw new Error('bifront missing from exact-codec registry');
const path = 'bench/holdout-ops/find-listing.txt';
const text = fs.readFileSync(path, 'utf8');
const m = await measure(entry, text, 'o200k_base', countTokens(text, 'o200k_base'));
const receipt = { key: m.key, registryEntries: codecEntries().length, lane: path,
  exact: m.exact, messageTokens: m.oneChatTokens,
  raw: countTokens(text, 'o200k_base'), note: m.note };
console.log(JSON.stringify(receipt, null, 2));
fs.writeFileSync('bench/x46/receipts/registry-smoke.json', JSON.stringify(receipt, null, 2) + '\n');
if (m.exact !== true || m.oneChatTokens == null || m.oneChatTokens > countTokens(text, 'o200k_base')) {
  throw new Error('registry smoke failed exact/no-regression result contract');
}
