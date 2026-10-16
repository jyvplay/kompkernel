// X16: LAKONIKOS-D vs DAEDALUS-D on the 28 frontier lanes, same process, OMEGA_DET=1.
// Writes one JSON row per lane to stdout and the wire + prompt to bench/x16/lakonikos-d/ for the external CPython check.
// usage: bench/x16/run-lakonikos-d.sh <lanes.txt>  (wraps this file)
import fs from 'node:fs';
import path from 'node:path';
import { daedalusDualEncode } from '@/lib/omega/daedalus-dual';
import { lakonikosDualEncode } from '@/lib/omega/lakonikos-d';
import { countTokens } from '@/lib/omega/bpe';
const ROOT = process.env.KOMP_ROOT ?? '/home/user/kompkernel';
const lanes = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean);
const outDir = path.join(ROOT, 'bench/x16/lakonikos-d');
fs.mkdirSync(outDir, { recursive: true });
for (const rel of lanes) {
  const f = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
  const text = fs.readFileSync(f, 'utf8');
  const base = path.basename(f);
  const d = daedalusDualEncode(text, 'o200k_base');
  const l = lakonikosDualEncode(text, 'o200k_base');
  const oneChatOk = countTokens(l.decoderPrompt || text, 'o200k_base') === l.messageTokens.o200k_base;
  const lakDecodeExact = l.mode === 'raw' ? true : l.decoded === text;
  const row = {
    file: base, mode: l.mode, arm: l.winningArm,
    daedalusDualM: d.messageTokens.o200k_base, lakonikosDM: l.messageTokens.o200k_base,
    daedalusDualM_cl100k: d.messageTokens.cl100k_base, lakonikosDM_cl100k: l.messageTokens.cl100k_base,
    saving: d.messageTokens.o200k_base - l.messageTokens.o200k_base,
    rawO200k: l.inTokens.o200k_base, exact: lakDecodeExact, countCheck: oneChatOk,
  };
  console.log(JSON.stringify(row));
  if (l.mode === 'daedalus') {
    fs.writeFileSync(path.join(outDir, base + '.wire.txt'), l.wire);
    fs.writeFileSync(path.join(outDir, base + '.src.txt'), text);
    fs.writeFileSync(path.join(outDir, base + '.prompt.txt'), l.decoderPrompt);
  }
}
