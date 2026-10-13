// Z42: DAEDALUS-D default (maxArms 2) vs maxArms 1 (predicted arm only), serial, same process, same sample as Z41 (2 per lane).
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { daedalusEncode } from '@/lib/omega/daedalus';
const OUT = process.env.OUT ?? '/home/user/z42/speed.jsonl';
const rows = fs.readFileSync('bench/z34/receipts/vxr-eval-151.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const per: Record<string, number> = {};
const sample: { idx: number; group: string; file: string }[] = [];
rows.forEach((r, i) => { per[r.group] = (per[r.group] ?? 0) + 1; if (per[r.group] <= 2) sample.push({ idx: i, group: r.group, file: r.file }); });
for (const s of sample) {
  const text = fs.readFileSync(s.file, 'utf8');
  for (const maxArms of [2, 1]) {
    const t0 = Date.now();
    const r = daedalusEncode(text, 'o200k_base', { dualTokenizer: true, maxArms });
    const ms = Date.now() - t0;
    const useW = r.mode === 'daedalus' && r.decoded === text;
    const o = useW ? countTokens(r.decoderPrompt, 'o200k_base') : countTokens(text, 'o200k_base');
    const c = useW ? countTokens(r.decoderPrompt, 'cl100k_base') : countTokens(text, 'cl100k_base');
    fs.appendFileSync(OUT, JSON.stringify({ idx: s.idx, group: s.group, file: s.file.split('/').slice(-3).join('/'), maxArms, o, c, arm: r.winningArm, armsRun: r.armsRun, predictionHit: r.predictionHit, exact: useW || r.mode === 'raw', ms }) + '\n');
  }
}
console.log('done');
