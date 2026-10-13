// Z40: DAEDALUS (baseline) vs DAEDALUS-D (dual-tokenizer pool) over the 151-file corpus (bench/z34/receipts/vxr-eval-151.jsonl).
// Sharded by SHARD=i/n. Each row: message tokens under o200k and cl100k for both codecs, arms, and exactness (decode === input).
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { daedalusDualEncode } from '@/lib/omega/daedalus-dual';
const [si, sn] = (process.env.SHARD ?? '0/1').split('/').map(Number);
const OUT = process.env.OUT ?? '/home/user/z40/dual-151.jsonl';
const rows = fs.readFileSync('bench/z34/receipts/vxr-eval-151.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
rows.forEach((r, i) => {
  if (i % sn !== si) return;
  const text = fs.readFileSync(r.file, 'utf8');
  const base = daedalusEncode(text, 'o200k_base', {});
  const baseExact = base.mode === 'raw' || base.decoded === text;
  const bO = base.mode === 'raw' ? countTokens(text, 'o200k_base') : base.messageTokens;
  const bC = base.mode === 'raw' ? countTokens(text, 'cl100k_base') : countTokens(base.decoderPrompt, 'cl100k_base');
  const d = daedalusDualEncode(text);
  fs.appendFileSync(OUT, JSON.stringify({
    idx: i, group: r.group, file: r.file, chars: text.length,
    inO: d.inTokens.o200k_base, inC: d.inTokens.cl100k_base,
    baseO: bO, baseC: bC, baseMode: base.mode, baseArm: base.winningArm, baseExact: baseExact,
    dualO: d.messageTokens.o200k_base, dualC: d.messageTokens.cl100k_base, dualMode: d.mode, dualArm: d.winningArm, dualExact: d.exact,
    ms: d.ms,
  }) + '\n');
});
console.log('done shard', si, sn);
