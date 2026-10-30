import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { archetyponEncode } from '../../src/lib/omega/archetypon';
import { chironLastEpochUsedUnits, workLastEpochUsed } from '../../src/lib/omega/workmeter';
const sha = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const lanes: [string, string, (t: string) => any][] = [
  ['ewf-daedalus', 'bench/x58/fixtures/ewf-standings.csv', (t) => daedalusEncode(t, 'o200k_base')],
  ['lic-mit-archetypon', 'bench/holdout/lic-mit.txt', (t) => archetyponEncode(t, 'o200k_base')],
];
for (const [name, path, fn] of lanes) {
  const text = fs.readFileSync(path, 'utf8');
  const s = Date.now(); const r: any = fn(text);
  console.log(JSON.stringify({ lane: name, chars: text.length, tokens: r.messageTokens, exact: r.decoded === text, sha: sha(r.message ?? r.decoderPrompt ?? r.wire ?? ""), chironUsed: chironLastEpochUsedUnits(), workUsed: workLastEpochUsed(), ms: Date.now() - s }));
}
