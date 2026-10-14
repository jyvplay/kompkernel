import fs from 'node:fs';
import { enthymemeEncode, enthymemeDecode, enthymemeDecoderPrompt } from '../../src/lib/omega/enthymeme';
import { countTokens } from '../../src/lib/omega/bpe';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const r = enthymemeEncode(t, 'o200k_base');
  const re = enthymemeDecode(r.wire);
  console.log(`${f.split('/').pop()}: exact=${r.exact} redecode=${re === t} M=${r.messageTokens} plainM=${r.plainMessageTokens} raw=${r.inTokens} promptTok=${countTokens(enthymemeDecoderPrompt(r.wire), 'o200k_base')} ms=${r.ms}\n  ${r.notes.slice(0, 300)}`);
  if (process.env.SHOW) console.log(enthymemeDecoderPrompt(r.wire).slice(0, +process.env.SHOW));
}
