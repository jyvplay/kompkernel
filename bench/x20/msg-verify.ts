/**
 * X20: verify that the *shipped message file* decodes byte-exactly.
 *
 * This is deliberately independent of the arm bookkeeping that produced the file:
 * it re-reads `bench/x20/llm/<lane>.msg.txt` off disk, splits the contract line off
 * the tail (only the text of the file is used, no JSON side channel), hands the wire
 * to the public decoder for that arm, and diffs the result against the original lane.
 *
 * usage: bench/x20/run.sh bench/x20/msg-verify.ts <lane> <arm> [<lane> <arm> ...]
 *   arm: daedalus | akolouthia2 | hemera | hora | dendrons
 */
import { readFileSync } from 'fs';
import { henosisDecode, type HenosisDualArm } from '@/lib/omega/henosis';

type Row = { lane: string; arm: string; wireBytes: number; origBytes: number; decodedBytes: number; exact: boolean; firstMismatch: string; armReported: number; contractTokens: number };

const args = process.argv.slice(2);
const jobs: [string, string][] = [];
for (let i = 0; i < args.length; i += 2) jobs.push([args[i], args[i + 1] as any]);

const rows: Row[] = [];
for (const [lane, arm] of jobs) {
  const orig = readFileSync(`bench/x20/llm/${lane}.orig.txt`);
  const msg = readFileSync(`bench/x20/llm/${lane}.msg.txt`, 'utf8');
  // The message is <wire><contract line>. The contract is the last line and the wire
  // ends with the newline that closes it, so the blank line before the contract is the
  // wire's own final newline.
  // Messages whose head is an arm-level contract line (AKOLOUTHIA's marker sentence,
  // HORA's/HEMERA's clock sentence) start with one or two contract lines before the
  // DAEDALUS wire, which always starts at CHIRON_START '$'. The wire is therefore
  // everything from the first '$' to the last newline (the wire keeps its own final
  // newline; the blank line before the tail contract is that newline).
  const start = msg.indexOf('§');
  const lastNl = msg.lastIndexOf('\n');
  const contract = msg.slice(lastNl + 1);
  if (start < 0) throw new Error(`no CHIRON_START in ${lane}.msg.txt`);
  const wire = msg.slice(start, lastNl);
  if (!/^New /.test(contract)) throw new Error(`no contract line in ${lane}.msg.txt: ${JSON.stringify(contract.slice(0, 40))}`);
  const dec = Buffer.from(henosisDecode(wire, arm as HenosisDualArm), 'utf8');
  const exact = dec.equals(orig);
  let firstMismatch = '-';
  if (!exact) {
    const n = Math.min(dec.length, orig.length);
    let k = 0;
    while (k < n && dec[k] === orig[k]) k++;
    firstMismatch = `byte ${k}: decoded=${JSON.stringify(dec.slice(Math.max(0, k - 12), k + 12).toString())} orig=${JSON.stringify(orig.slice(Math.max(0, k - 12), k + 12).toString())}`;
  }
  rows.push({
    lane,
    arm,
    wireBytes: Buffer.byteLength(wire, 'utf8'),
    origBytes: orig.length,
    decodedBytes: dec.length,
    exact,
    firstMismatch,
    armReported: 0,
    contractTokens: 0,
  });
}

for (const r of rows) {
  console.log(`${r.lane.padEnd(22)} arm=${r.arm.padEnd(12)} wire=${r.wireBytes}B orig=${r.origBytes}B dec=${r.decodedBytes}B exact=${r.exact ? 'YES' : 'NO'} ${r.exact ? '' : r.firstMismatch}`);
}
console.log(JSON.stringify(rows));
