// z11: KANON evaluation. Each row: KANON one-chat tokens, gate, exactness (kanonDecode), and AMPHORA baseline
// (for fold-path files AMPHORA is run separately; otherwise KANON's own fallback IS AMPHORA).
import fs from 'node:fs';
import { kanonEncode, kanonDecode } from '@/lib/omega/kanon';
import { amphoraEncode } from '@/lib/omega/amphora';
const files = fs.readFileSync(process.env.LIST || 'bench/z11/eval-81.txt', 'utf8').split('\n').filter(Boolean);
const SH = Number(process.env.SHARD || 0), NS = Number(process.env.NSHARD || 1);
files.forEach((f, i) => {
  if (i % NS !== SH) return;
  const t = fs.readFileSync(f, 'utf8');
  const k = kanonEncode(t, 'o200k_base');
  const kOk = kanonDecode(k.wire) === t;
  let amph: number, amphOk: boolean, amphWinner: string;
  if (k.gate === 'table-fold') {
    const a = amphoraEncode(t, 'o200k_base');
    amph = a.messageTokens; amphOk = a.exact && a.decoded === t; amphWinner = a.winner;
  } else {
    amph = k.messageTokens; amphOk = kOk; amphWinner = k.winner;
  }
  console.log(JSON.stringify({ f, in: k.inTokens, kanon: k.messageTokens, gate: k.gate, dirs: k.dirs, kOk, amph, amphOk, amphWinner, kWinner: k.winner, notes: k.notes.slice(0, 200), ms: k.ms }));
});
