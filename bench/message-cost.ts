/**
 * bench/message-cost.ts — THE HONEST SINGLE-MESSAGE COST BOARD.
 *
 * The repository's contract (and the user's constraint) is: an LLM decodes
 * the wire inside ONE chat input/output turn, with no skills.md, no system
 * prompt, no prior turn. Under that contract the cost of sending a payload
 * through a codec is
 *
 *      M = tokens(decoder instructions) + tokens(wire)
 *
 * because the instructions must travel in the same message. Raw text needs
 * no instructions (M = input tokens). This bench measures M live for
 * identity, HERMES, and the stacked frontier (PROTEUS / LOGOS / MOSAIC),
 * whose decoder prompts are measured with the same live tokenizer.
 */
import fs from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { hermesEncode, hermesDecoderPrompt } from '@/lib/omega/hermes';
import { logosEncode, logosDecoderPrompt } from '@/lib/omega/logos';
import { proteusEncode, proteusDecoderPrompt } from '@/lib/omega/proteus';
import { mosaicEncode, mosaicDecoderPrompt } from '@/lib/omega/mosaic';
import { CHAOS_900, CHAOS_F_LLM_REPORT, mosaicFixtures } from './fixtures';

async function main() {
  const enc = (process.argv[2] as EncodingName) || 'o200k_base';
  const f = mosaicFixtures();
  const allLanes: Array<[string, string]> = [
    ...fs.readdirSync('bench/holdout').sort().map(nm => ['holdout/' + nm, fs.readFileSync('bench/holdout/' + nm, 'utf8')] as [string, string]),
    ['CHAOS_900', CHAOS_900],
    ['CHAOS_F_LLM_REPORT', CHAOS_F_LLM_REPORT],
    ['json-log-40', f.jsonLog],
    ['csv-60', f.csv],
    ['chat-48', f.chat],
    ['grid-30', f.grid],
    ['rle-1400', f.rle],
    ['idrun-200', f.idrun],
    ['agent-turn', f.prose + '\n' + f.jsonLog + '\n' + f.rle + '\n' + f.chat],
    ['two-regime', f.jsonLog + '\n' + f.rle],
    ['three-regime', f.csv + '\n' + f.grid + '\n' + f.rle],
  ];
  // Stacked codecs are slow (LOGOS ~40 s per 8 KB lane); measure them on a
  // representative subset and extrapolate nothing — every printed number is
  // a live measurement on that lane.
  const stackedSubset = new Set(['holdout/gh-prose.txt', 'holdout/gh-api.json.txt', 'holdout/code-ts.txt', 'holdout/readme.txt', 'json-log-40', 'idrun-200', 'two-regime']);

  const logosPrompt = countTokens(logosDecoderPrompt(), enc);
  const proteusPrompt = countTokens(proteusDecoderPrompt(), enc);
  const mosaicPrompt = countTokens(mosaicDecoderPrompt(null), enc);
  console.log(`decoder instruction cost (live ${enc}):`);
  console.log(`  logos   : ${logosPrompt} tokens`);
  console.log(`  proteus : ${proteusPrompt} tokens`);
  console.log(`  mosaic  : ${mosaicPrompt} tokens`);
  console.log(`  hermes  : 0 fixed (adaptive ~100-215 per message, included in M below)`);
  console.log(`  identity: 0\n`);

  console.log('lane'.padEnd(24), 'in'.padStart(5), 'HERMES-M'.padStart(9), 'identity-M'.padStart(11), 'logos-M'.padStart(9), 'prot-M'.padStart(9), 'mosaic-M'.padStart(9));
  const tot = { in: 0, hermes: 0, identity: 0 };
  const stackedTot = { logos: 0, proteus: 0, mosaic: 0, n: 0 };
  for (const [lane, text] of allLanes) {
    const inT = countTokens(text, enc);
    const h = await hermesEncode(text, enc);
    tot.in += inT; tot.hermes += h.messageTokens; tot.identity += inT;
    let l = '-', p = '-', m = '-';
    if (stackedSubset.has(lane)) {
      const [lr, pr, mr] = await Promise.all([logosEncode(text, enc), proteusEncode(text, enc), Promise.resolve(mosaicEncode(text, enc))]);
      l = String(logosPrompt + lr.outTokens);
      p = String(proteusPrompt + pr.outTokens);
      m = String(mosaicPrompt + mr.outTokens);
      stackedTot.logos += logosPrompt + lr.outTokens;
      stackedTot.proteus += proteusPrompt + pr.outTokens;
      stackedTot.mosaic += mosaicPrompt + mr.outTokens;
      stackedTot.n++;
    }
    console.log(lane.padEnd(24), String(inT).padStart(5), String(h.messageTokens).padStart(9), String(inT).padStart(11), l.padStart(9), p.padStart(9), m.padStart(9));
  }
  console.log('\nTOTAL over all lanes (identity vs HERMES, honest single-message cost):');
  console.log(`  identity: ${tot.identity}   HERMES: ${tot.hermes}   (${((1 - tot.hermes / tot.identity) * 100).toFixed(1)}% saved)`);
  console.log(`\nStacked-frontier M on the ${stackedTot.n}-lane subset (prompt + wire, live):`);
  const sub = allLanes.filter(([l]) => stackedSubset.has(l)).reduce((a, [, t]) => a + countTokens(t, enc), 0);
  const subH = tot.identity - allLanes.filter(([l]) => !stackedSubset.has(l)).reduce((a, [, t]) => a + countTokens(t, enc), 0);
  const subHermes = tot.hermes - 0; // recompute below for the same subset
  let subHermesReal = 0;
  for (const [l, t] of allLanes) if (stackedSubset.has(l)) { const r = await hermesEncode(t, enc); subHermesReal += r.messageTokens; }
  console.log(`  subset input: ${sub}, HERMES-M: ${subHermesReal}, logos-M: ${stackedTot.logos}, proteus-M: ${stackedTot.proteus}, mosaic-M: ${stackedTot.mosaic}`);
  console.log(`  HERMES advantage vs LOGOS on the subset: ${(stackedTot.logos / subHermesReal).toFixed(1)}x`);
  void subH; void subHermes;
}
main().catch(e => { console.error(e); process.exit(1); });
