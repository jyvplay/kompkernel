// Z42: byte-identity + serial timing of merge-cache default (100000) vs disabled (0), maxArms 1, same 14-file sample.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { countTokens } from '@/lib/omega/bpe';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { setMergeCacheSize as s200 } from 'gpt-tokenizer/encoding/o200k_base';
import { setMergeCacheSize as s100 } from 'gpt-tokenizer/encoding/cl100k_base';
const OUT = process.env.OUT ?? '/home/user/z42/cache-identity.jsonl';
const rows = fs.readFileSync('bench/z34/receipts/vxr-eval-151.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const per: Record<string, number> = {};
const sample: { idx: number; group: string; file: string }[] = [];
rows.forEach((r, i) => { per[r.group] = (per[r.group] ?? 0) + 1; if (per[r.group] <= 2) sample.push({ idx: i, group: r.group, file: r.file }); });
const h = (s: string) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
for (const s of sample) {
  const text = fs.readFileSync(s.file, 'utf8');
  const res: Record<string, any> = {};
  for (const cfg of ['default', 'off']) {
    if (cfg === 'off') { s200(0); s100(0); } else { s200(100000); s100(100000); }
    const t0 = Date.now();
    const r = daedalusEncode(text, 'o200k_base', { dualTokenizer: true, maxArms: 1 });
    const ms = Date.now() - t0;
    const useW = r.mode === 'daedalus' && r.decoded === text;
    const prompt = useW ? r.decoderPrompt : text;
    res[cfg] = { ms, promptHash: h(prompt), mode: r.mode, arm: r.winningArm, exact: useW || r.mode === 'raw', o: countTokens(prompt, 'o200k_base'), c: countTokens(prompt, 'cl100k_base') };
  }
  fs.appendFileSync(OUT, JSON.stringify({ idx: s.idx, group: s.group, file: s.file.split('/').slice(-3).join('/'), identical: res.default.promptHash === res.off.promptHash, default: res.default, off: res.off }) + '\n');
}
console.log('done');
