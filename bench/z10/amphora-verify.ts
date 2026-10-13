// Verification of AMPHORA on the 43-file holdout + 4 long real documents. Each row: exact flags, winner, tokens.
import fs from 'node:fs';
import { amphoraEncode } from '@/lib/omega/amphora';
import { chironDecode } from '@/lib/omega/chiron';
const files: string[] = fs.readFileSync('bench/z10/verify-files.txt', 'utf8').split('\n').filter(Boolean);
const SH = Number(process.env.SHARD || 0), NS = Number(process.env.NSHARD || 1);
files.forEach((f, i) => {
  if (i % NS !== SH) return;
  const t = fs.readFileSync(f, 'utf8');
  const r = amphoraEncode(t, 'o200k_base');
  const decodeOk = chironDecode(r.wire) === t;
  console.log(JSON.stringify({ f, in: r.inTokens, msg: r.messageTokens, winner: r.winner, exact: r.exact, decodeOk, cands: r.candidates, ms: r.ms, wire: r.winner === 'identity' ? null : r.wire, notes: r.notes.slice(0, 220) }));
});
