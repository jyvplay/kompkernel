// z13: re-measure admissible codecs on ONE shared file list with the structured one-chat channel.
// Env: KEY (registry key), OUT (rows jsonl), WIRES (dir for output wires), LIST (file list).
// Uses the same measure() the app uses (src/lib/omega/registry.ts). oneChatTokens = codec-reported
// decoder-contract + wire cost (o200k), or raw input count when output === input, else null (inadmissible).
import fs from 'node:fs';
import path from 'node:path';
import { codecEntries, measure } from '@/lib/omega/registry';
import { countTokens } from '@/lib/omega/bpe';

const KEY = process.env.KEY as string;
const OUT = process.env.OUT as string;
const WIRES = process.env.WIRES as string;
const LIST = process.env.LIST || 'bench/z11/eval-81.txt';
const files = fs.readFileSync(LIST, 'utf8').split('\n').filter(Boolean);
const e = codecEntries().find((x) => x.key === KEY);
if (!e) { console.error('no entry ' + KEY); process.exit(3); }
fs.mkdirSync(path.join(WIRES, KEY), { recursive: true });
fs.rmSync(OUT, { force: true });

(async () => {
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const t = fs.readFileSync(f, 'utf8');
    const inTokens = countTokens(t, 'o200k_base');
    const r = await measure(e, t, 'o200k_base', inTokens);
    const wirePath = path.join(WIRES, KEY, `${String(i).padStart(3, '0')}.txt`);
    fs.writeFileSync(wirePath, r.output);
    const row = {
      key: KEY, idx: i, f, in: inTokens, wireTok: r.outTokens, oneChat: r.oneChatTokens,
      exact: r.exact, ms: Math.round(r.ms), error: r.error ?? null, note: (r.note ?? '').slice(0, 200),
    };
    fs.appendFileSync(OUT, JSON.stringify(row) + '\n');
  }
  fs.appendFileSync(OUT, JSON.stringify({ key: KEY, done: true }) + '\n');
})();
