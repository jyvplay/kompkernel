// Z43: score registry codecs on a file list with real tokenizers, round-trip check, one-chat cost.
// Env: FILES=<path to text file listing one path per line>  KEYS=a,b,c  ENCS=o200k_base,cl100k_base  OUT=<jsonl>
import fs from 'node:fs';
import { codecEntries } from '@/lib/omega/registry';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
const files = fs.readFileSync(process.env.FILES!, 'utf8').split('\n').filter(Boolean);
const keys = (process.env.KEYS ?? '').split(',').filter(Boolean);
const encs = (process.env.ENCS ?? 'o200k_base').split(',') as EncodingName[];
const OUT = process.env.OUT!;
const entries = codecEntries();
const want = keys.length ? entries.filter((e) => keys.includes(e.key)) : entries;
const missing = keys.filter((k) => !entries.some((e) => e.key === k));
if (missing.length) console.error('MISSING KEYS', missing.join(','));
async function main() {
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  for (const enc of encs) {
    const inTokens = countTokens(text, enc);
    for (const e of want) {
      const t0 = Date.now();
      let row: any;
      try {
        const r = await e.run(text, enc);
        const outTokens = countTokens(r.output, enc);
        // Z43: no wire-only fallback. A codec that reports no one-chat cost is inadmissible (oneChat=null).
        const oneChat = r.oneChat ?? null;
        row = { file: f, enc, key: e.key, inTokens, oneChat, outTokens, oneChatReported: r.oneChat ?? null, exact: r.decoded == null ? null : r.decoded === text, error: null, ms: Date.now() - t0, note: String(r.note ?? '').slice(0, 160) };
      } catch (err) {
        row = { file: f, enc, key: e.key, inTokens, oneChat: null, outTokens: null, exact: null, error: (err as Error).message, ms: Date.now() - t0, note: '' };
      }
      fs.appendFileSync(OUT, JSON.stringify(row) + '\n');
      console.error(`${enc} ${e.key} ${f.split('/').slice(-2).join('/')} in=${inTokens} oneChat=${row.oneChat} exact=${row.exact} ${row.error ? 'ERR ' + row.error.slice(0, 80) : ''} ${row.ms}ms`);
    }
  }
}
console.error('done');
}
main();
