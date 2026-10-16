// X16: split the DAEDALUS-D one-chat message into decoder contract tokens and wire tokens, per lane.
import fs from 'node:fs';
import { daedalusDualEncode } from '@/lib/omega/daedalus-dual';
import { countTokens } from '@/lib/omega/bpe';
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const r = daedalusDualEncode(text, 'o200k_base');
  const M = r.messageTokens.o200k_base;
  const wireT = countTokens(r.wire, 'o200k_base');
  const rawT = countTokens(text, 'o200k_base');
  console.log(JSON.stringify({ file: f.split('/').slice(-1)[0], mode: r.mode, rawTok: rawT, M, wireTok: wireT, contractTok: r.mode === 'daedalus' ? M - wireT : 0, winningArm: r.winningArm }));
}
