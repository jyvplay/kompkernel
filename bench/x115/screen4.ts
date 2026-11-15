/** X115 screen 4: wire-level radix exchange on the shipped CHIRON tape/body.
 * Reads completed baseline messages (no encoder calls). For each message whose
 * CHIRON expansion has unambiguous line-start symbolic modes, try replacing the
 * exact 10-char mode strings in the tape/body with octal, then verify
 * chironDecode(candidate) === enallageRewrite(expansion). Prices complete msg. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from '../../src/lib/omega/chiron';
import { enallageRewrite, enallageExpand, enallageSymbolicToOctal } from '../../src/lib/omega/enallage';

const enc = 'o200k_base' as const;
const T = (s: string) => countTokens(s, enc);
const KEY = 'X115. Body first. ^Tnnnn␠→T+chmod nnnn. Print only.';
const rows: any[] = [];
for (const line of fs.readFileSync(process.argv[2] ?? 'bench/x115/receipts/frontier.jsonl', 'utf8').split('\n').filter(Boolean)) {
  const r = JSON.parse(line);
  const m: string = r.message;
  const start = m.indexOf(CHIRON_START);
  if (start < 0) { rows.push({ path: r.path, tokens: r.tokens, note: 'no frame' }); continue; }
  let exp: string;
  try { exp = chironDecode(m.slice(start)); } catch { rows.push({ path: r.path, tokens: r.tokens, note: 'decode threw' }); continue; }
  const rw = enallageRewrite(exp);
  if (!rw) { rows.push({ path: r.path, tokens: r.tokens, note: 'no mode rewrite' }); continue; }
  // collect exact symbolic fields from expansion line starts
  const fields = new Map<string, string>();
  for (const mm of exp.matchAll(/^([dlcbps-])([r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-])(?= )/gm)) {
    const sym = mm[0];
    const oct = enallageSymbolicToOctal(mm[1]!, mm[2]!);
    if (oct) fields.set(sym, oct);
  }
  let cand = m;
  for (const [sym, oct] of [...fields.entries()].sort((a, b) => b[0].length - a[0].length)) {
    cand = cand.split(sym).join(oct);
  }
  cand = KEY + '\n' + cand;
  let ok = false;
  try {
    const cs = cand.indexOf(CHIRON_START);
    ok = chironDecode(cand.slice(cs)) === rw.wire && enallageExpand(rw.wire) === exp;
  } catch { ok = false; }
  const tok = T(cand);
  rows.push({ path: r.path, tokens: r.tokens, after: tok, delta: tok - r.tokens, exact: ok, fields: fields.size, hits: rw.hits });
  console.log(`${r.path.split('/').pop()!.padEnd(22)} M=${r.tokens} -> ${tok} Δ=${tok - r.tokens} exact=${ok} fields=${fields.size} hits=${rw.hits}`);
}
const base = rows.reduce((a, r) => a + r.tokens, 0);
const after = rows.reduce((a, r) => a + (r.exact && r.delta < 0 ? r.after : r.tokens), 0);
console.log(`TOTAL base ${base} best ${after} delta ${after - base}`);
fs.mkdirSync('bench/x115/receipts', { recursive: true });
fs.writeFileSync('bench/x115/receipts/screen4.json', JSON.stringify({ schema: 'kompkernel-x115-screen4-v1', key: KEY, keyTokens: T(KEY), totals: { base, after, delta: after - base }, rows }, null, 2) + '\n');
