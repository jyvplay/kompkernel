/**
 * bench/fast-pareto.ts
 * Exact Pareto frontier evaluator across all 15 fixture categories
 * for both o200k_base and cl100k_base BPE encodings.
 */
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { rosettaEncode, rosettaDecode } from '@/lib/omega/rosetta';
import { harmoniaEncode } from '@/lib/omega/harmonia';
import { aetherEncode } from '@/lib/omega/aether';
import { panaceaEncode } from '@/lib/omega/panacea';
import { mosaicEncode } from '@/lib/omega/mosaic';
import { kappaEncode, kappaDecode } from '@/lib/omega/kappa';
import { phraseEncode, phraseDecode } from '@/lib/omega/phrase';
import { tauEncode, tauDecode } from '@/lib/omega/tau';
import { signetEncode } from '@/lib/omega/signet';
import { veritasEncode } from '@/lib/omega/veritas';
import { valenceEncode } from '@/lib/omega/valence';
import { astralEncode } from '@/lib/omega/astral';
import { aeonEncode } from '@/lib/omega/aeon';
import { phoenixEncode } from '@/lib/omega/phoenix';
import { solarisEncode } from '@/lib/omega/solaris';
import { hyperionEncode } from '@/lib/omega/hyperion';
import { tensorEncode } from '@/lib/omega/tensor';
import { zeroEncode } from '@/lib/omega/zero';
import { orionEncode } from '@/lib/omega/orion';
import { exodusEncode } from '@/lib/omega/exodus';
import { omegaXiCompress, omegaXiDecode } from '@/lib/omega/atom-codec';

import {
  CHAOS_900,
  CHAOS_G_CJK,
  NATURAL_PROSE_1000,
  HYBRID_PROSE_1200,
  OUTPUT_PROMPT_LOG_2000,
  CHAOS_1500,
  mosaicFixtures,
  MOSAIC_HANDTRACE_300,
} from './fixtures';

async function runBenchmarkForEnc(enc: EncodingName) {
  const f = mosaicFixtures();
  const agentTurn = f.prose + '\n' + f.jsonLog + '\n' + f.rle + '\n' + f.chat;

  const categories: Array<[string, string]> = [
    ['chaos-900', CHAOS_900],
    ['chaos-g-cjk', CHAOS_G_CJK],
    ['natural-prose-1000', NATURAL_PROSE_1000],
    ['hybrid-prose-1200', HYBRID_PROSE_1200],
    ['prompt-log-2000', OUTPUT_PROMPT_LOG_2000],
    ['chaos-1500', CHAOS_1500],
    ['handtrace-300', MOSAIC_HANDTRACE_300],
    ['json-log-40', f.jsonLog],
    ['csv-60', f.csv],
    ['chat-48', f.chat],
    ['grid-30', f.grid],
    ['rle-1400', f.rle],
    ['idrun-200', f.idrun],
    ['prose', f.prose],
    ['agent-turn', agentTurn],
  ];

  console.log(`\n=================================================================`);
  console.log(` PARETO FRONTIER EVALUATION (${enc.toUpperCase()})`);
  console.log(`=================================================================\n`);

  for (const [catName, text] of categories) {
    const inTok = countTokens(text, enc);
    const results: Array<{ key: string; wireTok: number; ratio: number; exact: boolean; ms: number }> = [];

    const add = (key: string, wireTok: number, exact: boolean, ms: number) => {
      const ratio = inTok > 0 ? ((inTok - wireTok) / inTok) * 100 : 0;
      results.push({ key, wireTok, ratio, exact, ms });
    };

    // 1. Identity
    add('identity', inTok, true, 0.01);

    // 2. Rosetta
    let t0 = performance.now();
    const rR = await rosettaEncode(text, enc);
    add('rosetta', rR.outTokens, rR.exact && rosettaDecode(rR.wire, enc) === text, performance.now() - t0);

    // 3. Harmonia
    t0 = performance.now();
    const rH = await harmoniaEncode(text, enc);
    add('harmonia', rH.outTokens, rH.exact && rH.decoded === text, performance.now() - t0);

    // 4. Aether
    t0 = performance.now();
    const rA = await aetherEncode(text, enc);
    add('aether', rA.outTokens, rA.exact && rA.decoded === text, performance.now() - t0);

    // 5. Panacea
    t0 = performance.now();
    const rP = await panaceaEncode(text, enc);
    add('panacea', rP.outTokens, rP.exact && rP.decoded === text, performance.now() - t0);

    // 6. Mosaic
    t0 = performance.now();
    const rM = mosaicEncode(text, enc);
    add('mosaic', rM.outTokens, rM.exact && rM.decoded === text, performance.now() - t0);

    // 7. Kappa
    t0 = performance.now();
    const rK = kappaEncode(text, enc);
    add('kappa', rK.outTokens, rK.exact && kappaDecode(rK.wire) === text, performance.now() - t0);

    // 8. Phrase
    t0 = performance.now();
    const rPhr = phraseEncode(text, enc);
    add('phrase', rPhr.outTokens, rPhr.exact && phraseDecode(rPhr.wire, enc) === text, performance.now() - t0);

    // 9. Tau
    t0 = performance.now();
    const rT = tauEncode(text, enc);
    add('tau', rT.outTokens, rT.exact && tauDecode(rT.wire, enc) === text, performance.now() - t0);

    // 10. Signet
    t0 = performance.now();
    const rS = signetEncode(text, enc);
    add('signet', rS.outTokens, rS.exact && rS.decoded === text, performance.now() - t0);

    // 11. Valence
    t0 = performance.now();
    const rV = valenceEncode(text, enc);
    add('valence', rV.outTokens, rV.exact && rV.decoded === text, performance.now() - t0);

    // 12. Astral
    t0 = performance.now();
    const rAst = astralEncode(text, enc);
    add('astral', rAst.outTokens, rAst.exact && rAst.decoded === text, performance.now() - t0);

    // 13. Aeon
    t0 = performance.now();
    const rAe = aeonEncode(text, enc);
    add('aeon', rAe.outTokens, rAe.exact && rAe.decoded === text, performance.now() - t0);

    // 14. Phoenix
    t0 = performance.now();
    const rPh = phoenixEncode(text, enc);
    add('phoenix', rPh.outTokens, rPh.exact && rPh.decoded === text, performance.now() - t0);

    // 15. Zero
    t0 = performance.now();
    const rZ = zeroEncode(text, enc);
    add('zero', rZ.outTokens, rZ.exact && rZ.decoded === text, performance.now() - t0);

    // 16. OmegaXi
    t0 = performance.now();
    const rXi = await omegaXiCompress(text, enc);
    const xiBack = await omegaXiDecode(rXi.output, enc);
    add('omegaXi', rXi.outTokens, xiBack === text, performance.now() - t0);

    // Sort by wire tokens ascending
    results.sort((a, b) => a.wireTok - b.wireTok);

    const bestWire = results[0].wireTok;
    const bestLeaders = results.filter((r) => r.wireTok === bestWire).map((r) => r.key);

    console.log(`Category: ${catName.padEnd(20)} | Chars: ${String(text.length).padStart(5)} | InTok: ${String(inTok).padStart(4)} | Pareto Best: ${String(bestWire).padStart(4)} tok (${(( (inTok - bestWire) / inTok) * 100).toFixed(1)}% saved) by [${bestLeaders.join(', ')}]`);
  }
}

async function main() {
  await runBenchmarkForEnc('o200k_base');
  await runBenchmarkForEnc('cl100k_base');
}

main().catch(console.error);
