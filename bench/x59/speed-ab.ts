import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const sha = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const lanes: [string, string, (t: string) => any][] = [
  ['ewf-daedalus', 'bench/x58/fixtures/ewf-standings.csv', (t) => daedalusEncode(t, 'o200k_base')],
  ['metrics-tagstack', 'bench/holdout-x40/metrics.tsv', (t) => tagstackEncode(t, 'o200k_base')],
];
for (const [name, path, fn] of lanes) {
  const text = fs.readFileSync(path, 'utf8');
  const s = Date.now(); const r: any = fn(text);
  const msg = r.message ?? r.decoderPrompt ?? r.wire;
  console.log(JSON.stringify({ lane: name, tokens: r.messageTokens, exact: (r.decoded ?? text) === text, sha: sha(msg), ms: Date.now() - s }));
}
