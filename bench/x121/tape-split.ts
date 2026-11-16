/**
 * X121 — where does the remaining cost live?
 * Splits each saved ON wire into (contract preamble) | § tape ¶ | body and
 * reports o200k_base token counts and character counts for each part.
 * Reuses src/lib/omega/bpe and src/lib/omega/chiron constants. No encoder call.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_REP, CHIRON_LIST } from '../../src/lib/omega/chiron';

const enc = 'o200k_base' as const;
const src = process.argv[2] ?? 'bench/x120/receipts/ab-messages.jsonl';
const rows = fs.readFileSync(src, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

let tc = 0, tt = 0, tb = 0, tot = 0;
const out: any[] = [];
for (const r of rows) {
  const m: string = r.message;
  const s = m.indexOf(CHIRON_START);
  const p = s >= 0 ? m.indexOf(CHIRON_SEP, s + 1) : -1;
  const contract = s > 0 ? m.slice(0, s) : '';
  const tape = s >= 0 && p >= 0 ? m.slice(s + 1, p) : '';
  const body = p >= 0 ? m.slice(p + 1) : '';
  const c = countTokens(contract, enc), t = countTokens(tape, enc), b = countTokens(body, enc);
  const T = countTokens(m, enc);
  // count glyph occurrences in the body: single characters that appear in the tape
  tc += c; tt += t; tb += b; tot += T;
  out.push({ path: r.path, total: T, contract: c, tape: t, body: b,
    contractChars: contract.length, tapeChars: tape.length, bodyChars: body.length,
    tapeShare: +(t / T).toFixed(4), bodyShare: +(b / T).toFixed(4) });
}
console.log(JSON.stringify(out, null, 1));
console.log('TOTALS contract', tc, 'tape', tt, 'body', tb, 'total', tot,
  'tapeShare', (tt / tot).toFixed(4), 'contractShare', (tc / tot).toFixed(4));
