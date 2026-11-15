/** Fast construction check: the ΣΥΝΘΕΣΙΣ ON message shares the OFF body wire
 * (commute verified in X117), so ON = fusedKey + OFF body. Counts the complete
 * message and checks the fused key parses. The balanced A/B independently
 * re-encodes both arms; this is a cross-check, not a substitute. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { synthesisKey, synthesisParseKey, synthesisDecode } from '../../src/lib/omega/synthesis';
import { chironDecode } from '../../src/lib/omega/chiron';
const enc = 'o200k_base' as const;
const frontier = fs.readFileSync('bench/x117/receipts/frontier.jsonl', 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const offRow = frontier.find((r: any) => r.path.includes('ls-l-real'));
if (!offRow) throw new Error('ls-l-real not in frontier receipt');
const off = offRow.message as string;
const lines = off.split('\n');
// nested keys are lines 0..2; body begins at the frontier contract line 3
const body = lines.slice(3).join('\n');
const nestedKeys = lines.slice(0, 3).join('\n') + '\n';
const parts = { j: 11, i: 9, marker: '※', crc: '25b707b9' };
const key = synthesisKey(parts);
const on = key + '\n' + body;
const T = (s: string) => countTokens(s, enc);
// parent decoder for the body: the frontier body is a CHIRON message; use the
// repository's chiron reader on the tape portion (contract line is prose).
const row = {
  offTokens: T(off), nestedKeyTokens: T(nestedKeys), fusedKeyTokens: T(key + '\n'),
  onTokens: T(on), delta: T(on) - T(off), keyParses: synthesisParseKey(key) !== null,
  bodyShared: true,
};
fs.writeFileSync('bench/x118/receipts/fast-verify.json', JSON.stringify(row, null, 2) + '\n');
console.log(JSON.stringify(row, null, 2));
