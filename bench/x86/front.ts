/** X86 — frontier confirmation, and a lane-by-lane diff against the X80 receipt.
 *
 *  Adding a codec to the registry cannot move `tagstackFrontier` (the frontier is the
 *  base stack; registry arms are gated against it, not inside it), and neither can
 *  ΚΕΝΟΝ's one change to `kannabos.ts` — an extra optional parameter defaulting to
 *  `[]`, which leaves the candidate list identical for every existing caller. This
 *  script does not ask the reader to take that on trust: it re-runs the frontier over
 *  the same 29 lanes under `OMEGA_DET=1` and prints any lane whose token count, parent
 *  codec or exactness differs from `bench/x80/receipts/frontier.json`.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';

const enc: any = 'o200k_base';
const rows: any[] = [];
const t0 = Date.now();
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const t1 = Date.now();
  const r: any = tagstackFrontier(text, enc);
  const raw = countTokens(text, enc);
  rows.push({ path: p, raw, tokens: r.messageTokens, exact: r.decoded === text, parent: r.parentCodec, ms: Date.now() - t1 });
  console.log(`${p.split('/').pop()!.padEnd(24)} raw ${String(raw).padStart(5)} F ${String(r.messageTokens).padStart(5)} exact=${r.decoded === text} parent=${r.parentCodec} ${(Date.now() - t1)}ms`);
  fs.mkdirSync('bench/x86/receipts', { recursive: true });
  fs.writeFileSync(process.env.X86_FRONT_OUT ?? 'bench/x86/receipts/frontier.json',
    JSON.stringify({ det: process.env.OMEGA_DET ?? null, rows, total: rows.reduce((a, b) => a + b.tokens, 0) }, null, 1) + '\n');
}
const tot = rows.reduce((a, b) => a + b.tokens, 0);
console.log(`\nFRONTIER ${rows.length} TOTAL ${tot} exact ${rows.filter((r) => r.exact).length}/${rows.length} ms ${Date.now() - t0}`);

// Diff against the committed X80 receipt.
const prev = JSON.parse(fs.readFileSync(process.env.X86_FRONT_BASE ?? 'bench/x80/receipts/frontier.json', 'utf8'));
const P = new Map(prev.rows.map((r: any) => [r.path, r]));
let diffs = 0;
for (const r of rows) {
  const q = P.get(r.path);
  if (!q) { console.log(`  NEW LANE ${r.path}`); diffs++; continue; }
  if (q.tokens !== r.tokens || q.parent !== r.parent || q.exact !== r.exact || q.raw !== r.raw) {
    console.log(`  DIFF ${r.path}: X80 ${q.raw}/${q.tokens}/${q.parent}/${q.exact} -> X86 ${r.raw}/${r.tokens}/${r.parent}/${r.exact}`);
    diffs++;
  }
}
console.log(`X80 total ${prev.total} -> X86 total ${tot}  lanes differing: ${diffs}`);
console.log(diffs === 0 && prev.total === tot
  ? 'FRONTIER CONFIRMED: identical to the X80 configuration, lane for lane.'
  : 'FRONTIER MOVED — investigate before claiming anything.');
