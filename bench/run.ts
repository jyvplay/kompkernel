import { corpus } from './fixtures';
import { countTokens } from '../src/lib/omega/bpe';
import { mosaicEncode, mosaicDecode, mosaicDecoderPrompt } from '../src/lib/omega/mosaic';
import { auroraEncode, auroraDecode, auroraDecoderPrompt } from '../src/lib/omega/aurora';
import { atlasEncode, atlasDecode, atlasDecoderPrompt } from '../src/lib/omega/atlas';
import { lumenEncode, lumenDecode, LUMEN_SYSTEM_PROMPT } from '../src/lib/omega/lumen';
import { praxisEncode, praxisDecode, PRAXIS_SYSTEM_PROMPT } from '../src/lib/omega/praxis';
import { signetEncode, signetDecode, SIGNET_SYSTEM_PROMPT } from '../src/lib/omega/signet';

const enc = 'o200k_base' as const;
const c = corpus();
const rows: any[] = [];
for (const [name, text] of Object.entries(c)) {
  const inT = countTokens(text, enc);
  const m = mosaicEncode(text, enc);
  const a = auroraEncode(text, enc);
  const at = atlasEncode(text, enc);
  const l = lumenEncode(text, enc);
  const p = praxisEncode(text, enc);
  const s = signetEncode(text, enc);
  rows.push({
    name, inT,
    mosaic: m.outTokens, mosaicOk: mosaicDecode(m.wire) === text,
    aurora: a.outTokens, auroraOk: auroraDecode(a.wire) === text,
    atlasD: at.deliveredTokens,
    lumen: l.outTokens, lumenOk: lumenDecode(l.wire) === text,
    praxis: p.outTokens, praxisOk: praxisDecode(p.wire) === text,
    signet: s.outTokens,
    mDeliv: m.outTokens + countTokens(mosaicDecoderPrompt(m), enc),
    aDeliv: a.deliveredTokens,
  });
}
console.table(rows);
