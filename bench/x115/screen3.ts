/** X115 screen 3: re-price the existing fixed-point wire schedule (PALINDROMOS)
 * on the CURRENT baseline messages. This is a screen of an existing opt-in
 * mechanism, not a new codec claim. It measures whether a token dividend exists
 * at the current frontier before any scheduler is changed. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { palindromosEncode } from '../../src/lib/omega/palindromos';
import { CHIRON_START } from '../../src/lib/omega/chiron';

Object.assign(process.env, { OMEGA_DET: '1', OMEGA_NO_MEMO: '1', OMEGA_ENGRAM: '0', OMEGA_OURA_MEMO: '0', OMEGA_NO_OROTHESIA: '1', OMEGA_PALINDROMOS: '1' });
const enc = 'o200k_base' as const;
const src = process.argv[2] ?? 'bench/x115/receipts/frontier.jsonl';
const rows: any[] = [];
for (const line of fs.readFileSync(src, 'utf8').split('\n').filter(Boolean)) {
  const r = JSON.parse(line);
  const text = fs.readFileSync(r.path, 'utf8');
  const max = Number(process.env.X115_SCREEN3_MAX ?? '700');
  if (r.tokens > max) { rows.push({ path: r.path, tokens: r.tokens, note: 'skipped large' }); continue; }
  if (!r.message.includes(CHIRON_START)) { rows.push({ path: r.path, tokens: r.tokens, note: 'no frame' }); continue; }
  const t = performance.now();
  let p: any;
  try { p = palindromosEncode(text, enc, { message: r.message, messageTokens: r.tokens, decoded: text }); }
  catch (e) { rows.push({ path: r.path, tokens: r.tokens, note: 'threw ' + String(e) }); continue; }
  const dt = performance.now() - t;
  const tok = countTokens(p.message, enc);
  const exact = p.decoded === text || p.decoded === r.message; // palindromos decoded is chiron expansion; compare via notes below
  rows.push({ path: r.path, tokens: r.tokens, after: tok, delta: tok - r.tokens, applied: p.applied, rounds: p.rounds, steps: p.steps, byMember: p.byMember, ms: dt, notes: p.notes });
  console.log(`${r.path.split('/').pop()!.padEnd(22)} ${r.tokens} -> ${tok} Δ=${tok - r.tokens} applied=${p.applied} rounds=${p.rounds} steps=${p.steps} ms=${dt.toFixed(0)}`);
}
const base = rows.reduce((a, r) => a + r.tokens, 0);
const after = rows.reduce((a, r) => a + (r.after ?? r.tokens), 0);
console.log(`TOTAL ${base} -> ${after} Δ=${after - base}`);
fs.mkdirSync('bench/x115/receipts', { recursive: true });
fs.writeFileSync('bench/x115/receipts/screen3.json', JSON.stringify({ schema: 'kompkernel-x115-screen3-v1', note: 'PALINDROMOS re-price on current baseline messages; existing opt-in mechanism', totals: { base, after, delta: after - base }, rows }, null, 2) + '\n');
