/**
 * X101 — ΧΡΟΝΟΣ (chronos): where does the chain's wall clock actually go?
 * Per-codec timing on the dominant lanes, three reps, median.  This is the prerequisite for any
 * honest speed claim: a codec that is not the bottleneck cannot be the fix.
 */
import * as fs from 'node:fs';
import { chironDecode } from '../../src/lib/omega/chiron';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { isomorphiaEncode } from '../../src/lib/omega/isomorphia';
import { metataxisEncode } from '../../src/lib/omega/metataxis';
import { syndyasmosEncode } from '../../src/lib/omega/syndyasmos';
import { gennadasEncode } from '../../src/lib/omega/gennadas';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const srcPath = (lane: string): string => {
  for (const d of ['bench/holdout-x41', 'bench/holdout', 'bench/holdout-work', 'bench/holdout-x42', 'bench/holdout-x42b', 'bench/holdout-tbl', 'bench/holdout-x40', 'bench/holdout-ops', 'bench/holdout-lang', 'bench/holdout-mk', 'bench/holdout-x86', 'bench/holdout-x87']) {
    for (const e of ['', '.txt', '.md', '.patch']) { const f = `${d}/${lane}${e}`; if (fs.existsSync(f)) return f; }
  }
  throw new Error('no source for ' + lane);
};
const med = (xs: number[]): number => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const REPS = 3;
for (const lane of ['ls-l-real', 'apt-real', 'ps-aux-real']) {
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  const chironMs: number[] = [];
  for (let r = 0; r < REPS; r++) { const t = Date.now(); tagstackEncode(text, enc); chironMs.push(Date.now() - t); }
  const R: any = tagstackEncode(text, enc);
  const ref = chironDecode(R.message.slice(R.message.indexOf('§')));
  const isoMs: number[] = [], metaMs: number[] = [], syndMs: number[] = [], genMs: number[] = [];
  let cur = { message: R.message, messageTokens: R.messageTokens, decoded: ref };
  for (let r = 0; r < REPS; r++) { const t = Date.now(); isomorphiaEncode(ref, enc, cur as any); isoMs.push(Date.now() - t); }
  const I = isomorphiaEncode(ref, enc, cur as any);
  if (I.applied) cur = { message: I.message, messageTokens: I.messageTokens, decoded: ref };
  for (let r = 0; r < REPS; r++) { const t = Date.now(); metataxisEncode(ref, enc, cur as any); metaMs.push(Date.now() - t); }
  const M = metataxisEncode(ref, enc, cur as any);
  if (M.applied) cur = { message: M.message, messageTokens: M.messageTokens, decoded: ref };
  for (let r = 0; r < REPS; r++) { const t = Date.now(); syndyasmosEncode(ref, enc, cur as any); syndMs.push(Date.now() - t); }
  const S = syndyasmosEncode(ref, enc, cur as any);
  if (S.applied) cur = { message: S.message, messageTokens: S.messageTokens, decoded: ref };
  for (let r = 0; r < REPS; r++) { const t = Date.now(); gennadasEncode(ref, enc, cur as any); genMs.push(Date.now() - t); }
  const T = { chiron: med(chironMs), iso: med(isoMs), meta: med(metaMs), synd: med(syndMs), gen: med(genMs) };
  const tot = T.chiron + T.iso + T.meta + T.synd + T.gen;
  console.log(`${lane.padEnd(14)} tokens=${String(R.messageTokens).padStart(5)}  chiron=${String(T.chiron).padStart(7)}ms (${(100 * T.chiron / tot).toFixed(0)}%)  iso=${String(T.iso).padStart(6)}  meta=${String(T.meta).padStart(7)}ms (${(100 * T.meta / tot).toFixed(0)}%)  synd=${String(T.synd).padStart(7)}ms (${(100 * T.synd / tot).toFixed(0)}%)  gen=${String(T.gen).padStart(6)}  TOTAL=${String(tot).padStart(7)}ms`);
  console.log(`   reps: chiron ${chironMs.join('/')}  meta ${metaMs.join('/')}  synd ${syndMs.join('/')}  gen ${genMs.join('/')}`);
}
