/**
 * X95 — HOW MUCH DOES THE SPACE IN FRONT OF A REFERENCE RUN COST?
 *
 * THE OBSERVATION. vocab-bridge.ts found 41 726 bridge tokens in o200k_base, and among them
 * " " + 3..9 Cyrillic characters as a SINGLE token (1939 / 1558 / 1494 / 1111 / 680 / 457 / 269
 * for lengths 3..9). ariadne.ts already spells reference runs onto all-non-ASCII vocabulary words
 * ("Cyrillic has 1896 three-character, 1329 four-character and 1283 five-or-more-character single
 * tokens, so a five-reference run placed on one of them saves four tokens at a stroke"), but its
 * objective is the RUN. The space in front of the run is not in the objective, so whether the
 * space is absorbed into the same token is left to chance.
 *
 * WHY IT COULD BE LARGE. If a space-preceded run of k glyphs costs 1 + ct(run) tokens, the space
 * is paying a whole token; if it costs ct(run), the space is free because " " + run is itself a
 * vocabulary token. Every lane's body is full of space-preceded runs, so one token per run is a
 * general gain, not a lane-specific one. This probe measures the headroom exactly, on the ten
 * committed wires, with no frontier calls and no encodes: for every maximal glyph run it compares
 * ct(space + run) against ct(space) + ct(run) and against ct(run).
 *
 * A run whose space is ALREADY free is not headroom and is counted separately, so the number
 * reported is what a bridge-seeking assignment could still win, not what the stack already wins.
 */
import { countTokensExact } from '../../src/lib/omega/bpe';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ENC = 'o200k_base' as const;
const ct = (s: string) => countTokensExact(s, ENC);

const files = process.argv.slice(2);
const L: string[] = [];
const receipt: any = { note: 'cost of the space preceding a reference run; zero frontier calls', lanes: [] };
L.push('lane'.padEnd(14) + 'msgTok  runs  spacePreceded  alreadyFree  PAYING  headroom  byRunLen(paying)');
let T = { msg: 0, runs: 0, sp: 0, free: 0, pay: 0, head: 0 };
for (const f of files) {
  const wire = fs.readFileSync(f, 'utf8');
  const name = path.basename(f).replace('.wire.txt', '');
  const sec = wire.indexOf('§'), pil = wire.indexOf('¶', sec);
  const tape = wire.slice(sec + 1, pil), body = wire.slice(pil + 1);
  const GLYPH = new Set<string>();
  for (const ch of tape) if (ch.codePointAt(0)! > 127) GLYPH.add(ch);

  // maximal glyph runs in the body, with the character that precedes each
  const runs: { run: string; prev: string; at: number }[] = [];
  let i = 0;
  while (i < body.length) {
    if (GLYPH.has(body[i])) {
      let j = i; while (j < body.length && GLYPH.has(body[j])) j++;
      runs.push({ run: body.slice(i, j), prev: i > 0 ? body[i - 1] : '', at: i });
      i = j;
    } else i++;
  }
  let sp = 0, free = 0, pay = 0, head = 0;
  const byLen = new Map<number, number>();
  for (const r of runs) {
    if (r.prev !== ' ') continue;
    sp++;
    const alone = ct(r.run);
    const withSpace = ct(' ' + r.run);
    // the space on its own costs 1 token; if " "+run costs no more than run alone, the space is
    // absorbed by the merge and is already free. Otherwise it is paying and a bridge-seeking
    // assignment could recover the difference.
    if (withSpace <= alone) free++;
    else { pay++; head += withSpace - alone; byLen.set(r.run.length, (byLen.get(r.run.length) ?? 0) + (withSpace - alone)); }
  }
  L.push(name.padEnd(14) + String(ct(wire)).padStart(6) + String(runs.length).padStart(6) + String(sp).padStart(13) +
    String(free).padStart(13) + String(pay).padStart(8) + String(head).padStart(10) + '  ' +
    [...byLen.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join(' '));
  receipt.lanes.push({ lane: name, path: f, msgTokens: ct(wire), runs: runs.length, spacePreceded: sp,
    alreadyFree: free, paying: pay, headroomTokens: head, payingByRunLength: [...byLen.entries()].sort((a, b) => a[0] - b[0]) });
  T.msg += ct(wire); T.runs += runs.length; T.sp += sp; T.free += free; T.pay += pay; T.head += head;
}
L.push('-'.repeat(100));
L.push(`TOTAL: msgTokens ${T.msg}  runs ${T.runs}  space-preceded ${T.sp}  space already free ${T.free}  space PAYING ${T.pay}  HEADROOM ${T.head} tokens (${(100 * T.head / T.msg).toFixed(2)}% of the ten-wire total)`);
L.push(`free rate among space-preceded runs: ${(100 * T.free / Math.max(1, T.sp)).toFixed(1)}%`);
const log = L.join('\n') + '\n';
fs.mkdirSync('bench/x95/receipts', { recursive: true });
fs.writeFileSync('bench/x95/receipts/space-bridge-headroom.json', JSON.stringify(receipt, null, 1) + '\n');
fs.writeFileSync('bench/x95/receipts/space-bridge-headroom.log', log);
console.log(log);
