// Z44: independent verification of PR #27 GRAMMA on the *shared* 43-file corpus,
// i.e. outside the 8 files its own bench used. M = contract + wire, o200k_base.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { grammaEncode, grammaDecode } from '@/lib/omega/gramma';
const files = fs.readFileSync('bench/z44/corpus-53.txt', 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const out = process.env.OUT ?? 'bench/z44/receipts/gramma-corpus.jsonl';
let win = 0, lose = 0, tie = 0, bad = 0, tD = 0, tG = 0;
const rows: any[] = [];
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const raw = countTokens(t, 'o200k_base');
  const d = daedalusEncode(t, 'o200k_base');
  const g = grammaEncode(t, 'o200k_base');
  const exact = g.decoded === t;
  if (!exact) bad++;
  const delta = g.messageTokens - d.messageTokens;
  if (delta < 0) win++; else if (delta > 0) lose++; else tie++;
  tD += d.messageTokens; tG += g.messageTokens;
  rows.push({ file: f, raw, dae: d.messageTokens, gramma: g.messageTokens, dialect: g.winningDialect ?? null, exact, delta });
  console.error(`${f.split('/').slice(-2).join('/').padEnd(34)} raw=${String(raw).padStart(6)} dae=${String(d.messageTokens).padStart(6)} gramma=${String(g.messageTokens).padStart(6)} ${String(g.winningDialect ?? '-').padEnd(9)} d=${delta} exact=${exact}`);
}
fs.writeFileSync(out, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
console.log(`\nTOTAL dae=${tD} gramma=${tG} delta=${tG - tD}  wins=${win} ties=${tie} losses=${lose} inexact=${bad}`);
