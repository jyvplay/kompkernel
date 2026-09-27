/**
 * CHIRON vs the HERMES stack on the honest one-chat metric.
 *
 *   I  = tokens(input)
 *   W  = tokens(wire alone)
 *   M  = tokens(decoder contract + wire) — the only number a user actually pays
 *
 * Every row asserts an exact UTF-16 round-trip through the library decoder.
 * Run: ./bench/tmp/build.sh bench/chiron-frontier.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '../src/lib/omega/bpe';
import { hermesEncode, hermesDecoderPrompt } from '../src/lib/omega/hermes';
import { hermesFractalEncode, hermesFractalDecoderPrompt } from '../src/lib/omega/hermes-fractal';
import { hermesContractEncode } from '../src/lib/omega/hermes-contract';
import { chironEncode, chironDecode } from '../src/lib/omega/chiron';
import { ariadneEncode } from '../src/lib/omega/ariadne';
import { sibylEncode } from '../src/lib/omega/sibyl';
import { sequoyahEncode } from '../src/lib/omega/sequoyah';
import { CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, MOSAIC_HANDTRACE_300, BANYAN_INTERLEAVED, mosaicFixtures } from './fixtures';

const ENC = 'o200k_base' as const;
const T = (s: string) => countTokens(s, ENC);

function lanes(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const ho = 'bench/holdout';
  for (const f of fs.readdirSync(ho).sort()) out.push([`ho/${f.replace(/\.txt$/, '')}`, fs.readFileSync(path.join(ho, f), 'utf8')]);
  out.push(['CHAOS_900', CHAOS_900], ['CHAOS_G_CJK', CHAOS_G_CJK], ['CHAOS_F_LLM_REPORT', CHAOS_F_LLM_REPORT],
    ['MOSAIC_HANDTRACE_300', MOSAIC_HANDTRACE_300], ['BANYAN_INTERLEAVED', BANYAN_INTERLEAVED]);
  const f = mosaicFixtures();
  out.push(['json-log-40', f.jsonLog], ['csv-60', f.csv], ['chat-48', f.chat], ['grid-30', f.grid],
    ['rle-1400', f.rle], ['idrun-200', f.idrun], ['prose', f.prose]);
  out.push(['agent-turn', AGENT_TURN], ['two-regime', TWO_REGIME], ['three-regime', THREE_REGIME]);
  const tr = 'bench/train';
  for (const f2 of ['doc10.txt', 'doc11.txt', 'doc2.txt', 'doc3.txt', 'doc5.txt', 'doc8.txt', 'dts0.txt', 'dts1.txt', 'dts2.txt', 'dts3.txt', 'dts4.txt', 'dts5.txt']) {
    out.push([`tr/${f2.replace(/\.txt$/, '')}`, fs.readFileSync(path.join(tr, f2), 'utf8')]);
  }
  return out;
}

const AGENT_TURN = [
  'You are reviewing a deployment. Here is the plan:',
  ...Array.from({ length: 18 }, (_, i) => `step ${i + 1}: run the migration shard-${i + 1} with checksum verification enabled and retry budget 3`),
  '',
  'Observed output:',
  ...Array.from({ length: 18 }, (_, i) => `[ok] shard-${i + 1} migrated 1024 rows in ${120 + i * 7}ms (checksum matched, retries used 0)`),
  '',
  'Please summarise the risk and tell me whether to proceed with the cutover tonight.',
].join('\n');

const TWO_REGIME = [
  'Release notes for the platform update. The scheduler now coalesces retries, the log writer batches flushes, and the API gateway understands the new tenant header. Operators should expect a brief pause during rollout.',
  ...Array.from({ length: 30 }, (_, i) => `2026-03-${String((i % 28) + 1).padStart(2, '0')} 09:${String(i % 60).padStart(2, '0')}:11 INFO scheduler coalesced ${i * 3} retries for tenant t-${1000 + i}`),
].join('\n');

const THREE_REGIME = [
  'Migration runbook. Read the whole document before starting. Each phase is reversible until the cutover.',
  ...Array.from({ length: 14 }, (_, i) => `phase-${i}: drain,copy,verify,swap`),
  'Prose interlude: if verification fails at any phase, stop and page the on-call engineer; do not attempt a partial swap.',
  ...Array.from({ length: 14 }, (_, i) => `{"phase":${i},"drained":true,"copied":${i * 100},"verified":true}`),
].join('\n');

interface Row {
  lane: string; I: number;
  Wo: number; Mo: number;
  Wf: number; Mf: number;
  Mc: number;
  Wx: number; Mx: number; xms: number; xmode: string; xnotes: string;
  Wa: number; Ma: number; ams: number; anotes: string;
  Ws: number; Ms: number; sms: number; snotes: string; swords: number;
  Mq: number; qms: number; qnotes: string; qdet: boolean;
  bestOld: number; best: number;
}

async function main() {
  const rows: Row[] = [];
  const all = lanes();
  for (const [lane, text] of all) {
    const I = T(text);
    const o = await hermesEncode(text, ENC);
    if (o.decoded !== text) throw new Error(`HERMES-Ω round-trip failed on ${lane}`);
    const Mo = T(hermesDecoderPrompt(o.wire, ENC));
    const fr = hermesFractalEncode(text, ENC);
    if (fr.decoded !== text) throw new Error(`HERMES-F round-trip failed on ${lane}`);
    const Mf = T(hermesFractalDecoderPrompt() + '\n' + fr.wire);
    const c = hermesContractEncode(text, ENC);
    const Mc = c.oneChatTokens;

    const x = chironEncode(text, ENC);
    if (x.decoded !== text) throw new Error(`CHIRON round-trip failed on ${lane}`);
    if (chironDecode(x.wire) !== text) throw new Error(`CHIRON re-decode failed on ${lane}`);
    if (x.messageTokens !== T(x.decoderPrompt)) throw new Error(`CHIRON message accounting wrong on ${lane}`);

    const a = ariadneEncode(text, ENC);
    if (a.decoded !== text) throw new Error(`ARIADNE round-trip failed on ${lane}`);
    if (chironDecode(a.wire) !== text) throw new Error(`ARIADNE wire not readable by the CHIRON decoder on ${lane}`);
    if (a.messageTokens !== T(a.decoderPrompt)) throw new Error(`ARIADNE message accounting wrong on ${lane}`);

    const sb = sibylEncode(text, ENC);
    if (sb.decoded !== text) throw new Error(`SIBYL round-trip failed on ${lane}`);
    if (chironDecode(sb.wire) !== text) throw new Error(`SIBYL wire not readable by the shared decoder on ${lane}`);
    if (sb.messageTokens !== T(sb.decoderPrompt)) throw new Error(`SIBYL message accounting wrong on ${lane}`);

    const q = sequoyahEncode(text, ENC);
    if (q.decoded !== text) throw new Error(`SEQUOYAH round-trip failed on ${lane}`);
    if (chironDecode(q.wire) !== text) throw new Error(`SEQUOYAH wire not readable by the shared decoder on ${lane}`);
    if (q.messageTokens !== T(q.decoderPrompt)) throw new Error(`SEQUOYAH message accounting wrong on ${lane}`);
    const qdet = sequoyahEncode(text, ENC).wire === q.wire;

    const bestOld = Math.min(I, Mo, Mf, Mc);
    rows.push({
      lane, I,
      Wo: o.outTokens, Mo, Wf: fr.outTokens, Mf, Mc,
      Wx: x.outTokens, Mx: x.messageTokens, xms: x.ms, xmode: x.mode, xnotes: x.notes,
      Wa: a.outTokens, Ma: a.messageTokens, ams: a.ms, anotes: a.notes,
      Ws: sb.outTokens, Ms: sb.messageTokens, sms: sb.ms, snotes: sb.notes, swords: sb.wordRules,
      Mq: q.messageTokens, qms: q.ms, qnotes: q.notes, qdet,
      bestOld, best: Math.min(bestOld, x.messageTokens, a.messageTokens, sb.messageTokens, q.messageTokens),
    });
  }

  const pad = (s: string | number, n: number) => String(s).padStart(n);
  console.log('lane                       I     Mo     Mc     Mx     Ma     Ms   SBms     Mq   SQms det  bestOld   best  Δall');
  let sI = 0, sMo = 0, sMf = 0, sMc = 0, sMx = 0, sMa = 0, sMs = 0, sMq = 0, sOld = 0, sBest = 0, sms = 0, sams = 0, ssms = 0, sqms = 0;
  let detOk = 0;
  for (const r of rows) {
    const dall = r.best - r.bestOld;
    if (r.qdet) detOk++;
    console.log(
      r.lane.padEnd(20) + pad(r.I, 6) + pad(r.Mo, 7) + pad(r.Mc, 7) +
      pad(r.Mx, 7) + pad(r.Ma, 7) + pad(r.Ms, 7) + pad(r.sms, 7) + pad(r.Mq, 7) + pad(r.qms, 7) +
      (r.qdet ? '  Y ' : '  N ') + pad(r.bestOld, 8) + pad(r.best, 7) + pad(dall > 0 ? `+${dall}` : String(dall), 6));
    sI += r.I; sMo += r.Mo; sMf += r.Mf; sMc += r.Mc; sMx += r.Mx; sMa += r.Ma; sMs += r.Ms; sMq += r.Mq; sOld += r.bestOld; sBest += r.best; sms += r.xms; sams += r.ams; ssms += r.sms; sqms += r.qms;
  }
  console.log('TOTAL'.padEnd(20) + pad(sI, 6) + pad(sMo, 7) + pad(sMc, 7) + pad(sMx, 7) + pad(sMa, 7) + pad(sMs, 7) + pad(ssms, 7) + pad(sMq, 7) + pad(sqms, 7) + '    ' + pad(sOld, 8) + pad(sBest, 7) + pad(sBest - sOld, 6));
  console.log('');
  console.log(`HERMES-F total M ${sMf}`);
  console.log(`CHIRON  total M ${sMx}   wall ${(sms / 1000).toFixed(1)}s`);
  console.log(`ARIADNE total M ${sMa}   wall ${(sams / 1000).toFixed(1)}s`);
  console.log(`SIBYL   total M ${sMs}   wall ${(ssms / 1000).toFixed(1)}s`);
  console.log(`SEQUOYAH total M ${sMq}  wall ${(sqms / 1000).toFixed(1)}s   deterministic on ${detOk}/${rows.length} lanes`);
  const sWins = rows.filter(r => r.Ms < r.Ma).length;
  console.log(`SIBYL beats ARIADNE on ${sWins}/${rows.length} lanes`);
  console.log(`SEQUOYAH beats SIBYL on ${rows.filter(r => r.Mq < r.Ms).length}/${rows.length}, loses on ${rows.filter(r => r.Mq > r.Ms).length}`);
  console.log(`lanes where SEQUOYAH alone sets the frontier: ${rows.filter(r => r.Mq < Math.min(r.Ms, r.Ma, r.Mx, r.bestOld)).length}`);
  const wordLanes = rows.filter(r => r.swords > 0);
  console.log(`single-token rules admitted on ${wordLanes.length} lanes; they are worth ${wordLanes.reduce((a, r) => a + (r.Ma - r.Ms), 0)} tokens there`);
  console.log('');
  const wins = rows.filter(r => r.best < r.bestOld);
  const losses = rows.filter(r => r.best > r.bestOld);
  console.log(`lanes strictly improved vs the previous stack: ${wins.length}/${rows.length}`);
  console.log(`lanes where CHIRON is worse      : ${losses.length}  (the frontier never regresses: best = min(old, CHIRON))`);
  console.log(`frontier total  ${sOld} -> ${sBest}   (${(100 * (sOld - sBest) / sOld).toFixed(2)}% off the previous best-of-stack)`);
  console.log(`CHIRON alone    ${sMx} vs HERMES-Ω ${sMo} (${(100 * (sMo - sMx) / sMo).toFixed(2)}% better) vs identity ${sI}`);
  console.log('');
  console.log('biggest single-lane wins:');
  for (const r of [...wins].sort((a, b) => (a.best - a.bestOld) - (b.best - b.bestOld)).slice(0, 14)) {
    console.log(`  ${r.lane.padEnd(20)} ${pad(r.bestOld, 6)} -> ${pad(r.best, 6)}   ${pad(r.best - r.bestOld, 6)}   ${(r.Ms <= Math.min(r.Ma, r.Mx) ? r.snotes : r.Ma <= r.Mx ? r.anotes : r.xnotes).slice(0, 92)}`);
  }
  if (losses.length) {
    console.log('lanes where CHIRON loses to the old stack:');
    for (const r of losses) console.log(`  ${r.lane.padEnd(20)} ${pad(r.bestOld, 6)} -> ${pad(r.best, 6)}   +${r.best - r.bestOld}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
