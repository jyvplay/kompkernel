// Token breakdown of a CHIRON wire: contract / tape / body. Uses a fast budget (structure only).
import fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { chironEncode, chironDecoderPrompt, CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const r = chironEncode(t, 'o200k_base', { workUnits: 4_000_000 });
  const w = r.wire as string;
  const cut = w.indexOf(CHIRON_SEP);
  const tape = w.startsWith(CHIRON_START) && cut > 0 ? w.slice(0, cut) : '';
  const body = cut > 0 ? w.slice(cut + 1) : w;
  const contract = chironDecoderPrompt(w).split('\n')[1] ?? '';
  console.log(JSON.stringify({
    file: f.split('/').slice(-2).join('/'), raw: countTokens(t, 'o200k_base'), exact: r.decoded === t,
    msg: r.messageTokens, contract: countTokens(contract, 'o200k_base'),
    tape: countTokens(tape, 'o200k_base'), body: countTokens(body, 'o200k_base'), tapeChars: tape.length, bodyChars: body.length,
  }));
}
