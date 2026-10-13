// Generates visible messages (decoderPrompt = terse contract + wire) from hidden originals.
// Only writes files under visible/ and wire/ (wire kept hidden for scoring). Originals are not modified.
import fs from 'node:fs';
import { lakonikosEncode } from '../../src/lib/omega/lakonikos';
import { countTokens } from '../../src/lib/omega/bpe';
for (const i of [1, 2, 3]) {
  const t = fs.readFileSync(`bench/llm-blind-terse/hidden/orig_${i}.txt`, 'utf8');
  const r = lakonikosEncode(t, 'o200k_base');
  fs.writeFileSync(`bench/llm-blind-terse/hidden/wire_${i}.txt`, r.wire);
  fs.writeFileSync(`bench/llm-blind-terse/visible/msg_${i}.txt`, r.decoderPrompt);
  console.log(JSON.stringify({ i, mode: r.mode, exact: r.exact, msg: r.messageTokens, daedalusMsg: r.messageTokensOld, raw: countTokens(t, 'o200k_base'), wireChars: r.wire.length, hasRules: r.wire.startsWith('§') }));
}
