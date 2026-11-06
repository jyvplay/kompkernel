/**
 * X75 / speed — the count-memo A/B, tokens identical, wall clock measured.
 * ARM=nocache sets OMEGA_NO_COUNT_MEMO=1 (the old 4 096-character ceiling).
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const arm = process.env.OMEGA_NO_COUNT_MEMO === '1' ? 'old(4096)' : 'memo(65536)';
let total = 0, tok = 0;
const t00 = Date.now();
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const r: any = tagstackFrontier(t, enc);
  const ms = Date.now() - t0;
  rows.push({ path: p, tokens: r.messageTokens, ms, chars: t.length });
  total += ms; tok += r.messageTokens;
  console.log(`${p.split('/').pop()!.padEnd(20)} ${String(t.length).padStart(6)} chars ${String(r.messageTokens).padStart(5)} tok ${String(ms).padStart(6)} ms`);
}
console.log(`\nARM ${arm} lanes ${rows.length} tokens ${tok} wall ${total} ms`);
fs.writeFileSync(`bench/x75/receipts/speed-${arm.startsWith('old') ? 'old' : 'memo'}.json`, JSON.stringify({ arm, tokens: tok, ms: total, rows }, null, 1) + '\n');
