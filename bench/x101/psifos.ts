/**
 * X101 — ΨΗΦΟΣ (psifos, "the pebble/counter"): census of DIGIT STRUCTURE inside the ten
 * authoritative ΧΕΙΡΟΝ wires, to decide whether a wire-level number transform has a population.
 *
 * ΟΥΡΑ (X38) collapses numbers in the SOURCE before ΧΕΙΡΟΝ mines the tape, so it can never see the
 * digit runs that ΧΕΙΡΟΝ's own re-spelling and the tape's counts introduce afterwards.  This census
 * measures what is left: how many digit runs the wires carry, how long they are, and what a
 * tail-anchored collapse would have to beat.
 */
import * as fs from 'node:fs';
import { tokenStrings } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';
const enc: any = 'o200k_base';
const rows: any[] = [];
let gRuns = 0, gDigits = 0, gTok = 0, gSaving = 0;
for (const f of fs.readdirSync('bench/x87/receipts/wires').sort()) {
  const msg = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const w = msg.indexOf(CHIRON_START), t = msg.indexOf(CHIRON_SEP, w);
  const tape = msg.slice(w + 1, t), body = msg.slice(t + 1);
  const T = tokenStrings(msg, enc).map(x => x.s);
  const isDig = (s: string): boolean => /^[0-9]+$/.test(s);
  const dig = T.filter(isDig);
  const runs: Array<{ s: string; where: string }> = [];
  for (const [tag, txt] of [['tape', tape], ['body', body]] as Array<[string, string]>) {
    const re = /[0-9]{2,}/g; let m: RegExpExecArray | null;
    while ((m = re.exec(txt))) runs.push({ s: m[0], where: tag });
  }
  const byLen = new Map<number, number>();
  for (const r of runs) byLen.set(r.s.length, (byLen.get(r.s.length) ?? 0) + 1);
  const cost = (s: string): number => tokenStrings(s, enc).length;
  let saving = 0;
  for (const r of runs) saving += Math.max(0, cost(r.s) - 1);
  gRuns += runs.length; gDigits += dig.length; gTok += T.length; gSaving += saving;
  rows.push({ lane: f, msgTokens: T.length, digitTokens: dig.length, runs: runs.length, byLen: [...byLen.entries()].sort((a, b) => a[0] - b[0]), upperBoundSaving: saving });
  console.log(`${f.padEnd(20)} tok=${String(T.length).padStart(5)} digitTok=${String(dig.length).padStart(4)} (${(100 * dig.length / T.length).toFixed(1)}%)  runs>=2=${String(runs.length).padStart(4)}  byLen=${JSON.stringify([...byLen.entries()].sort((a, b) => a[0] - b[0]))}  UBsave=${String(saving).padStart(4)}`);
}
console.log(`\nPSIFOS: over the ten wires - ${gTok} tokens, ${gDigits} pure-digit tokens (${(100 * gDigits / gTok).toFixed(2)}%), ${gRuns} digit runs of length >= 2, upper-bound saving if every run became one token = ${gSaving}`);
fs.writeFileSync('bench/x101/receipts/psifos.json', JSON.stringify({ rows, gRuns, gDigits, gTok, gSaving }, null, 1));
