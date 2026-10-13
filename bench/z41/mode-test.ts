// Z41: pool modes for DAEDALUS (false | true | 'first' | 'pairs') on a stratified sample of the 151-file corpus.
// Sample: up to MAXPER files per lane (receipts order) plus any FILES listed in env. Sharded by SHARD=i/n.
// Row: o200k and cl100k message tokens (decoder instruction with wire embedded), arm, decode-exact flag.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { daedalusEncode } from '@/lib/omega/daedalus';
import type { DualMode } from '@/lib/omega/ariadne';
const [si, sn] = (process.env.SHARD ?? '0/1').split('/').map(Number);
const OUT = process.env.OUT ?? '/home/user/z41/modes.jsonl';
const MODES: DualMode[] = (process.env.MODES ?? 'first,pairs').split(',').map((m) => (m === 'first' || m === 'pairs' ? m : m === 'true' ? true : false));
const MAXPER = Number(process.env.MAXPER ?? 2);
const rows = fs.readFileSync('bench/z34/receipts/vxr-eval-151.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const perGroup: Record<string, number> = {};
const sample: { idx: number; group: string; file: string }[] = [];
rows.forEach((r, i) => {
  perGroup[r.group] = (perGroup[r.group] ?? 0) + 1;
  if (perGroup[r.group] <= MAXPER) sample.push({ idx: i, group: r.group, file: r.file });
});
const extra = (process.env.FILES ?? '').split(',').filter(Boolean);
for (const f of extra) sample.push({ idx: -1, group: 'extra', file: f });
sample.forEach((s, k) => {
  if (k % sn !== si) return;
  const text = fs.readFileSync(s.file, 'utf8');
  for (const mode of MODES) {
    const t0 = Date.now();
    const r = daedalusEncode(text, 'o200k_base', { dualTokenizer: mode, noBlocks: process.env.NOBLOCKS === '1' });
    const useW = r.mode === 'daedalus' && r.decoded === text;
    const o = useW ? countTokens(r.decoderPrompt, 'o200k_base') : countTokens(text, 'o200k_base');
    const c = useW ? countTokens(r.decoderPrompt, 'cl100k_base') : countTokens(text, 'cl100k_base');
    fs.appendFileSync(OUT, JSON.stringify({ idx: s.idx, group: s.group, file: s.file.split('/').slice(-3).join('/'), mode: String(mode) + (process.env.NOBLOCKS === '1' ? '-noblocks' : ''), o, c, arm: r.winningArm, exact: useW || r.mode === 'raw', ms: Date.now() - t0 }) + '\n');
  }
});
console.log('done', si, sn, sample.length);
