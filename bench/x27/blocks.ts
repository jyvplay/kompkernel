/**
 * X27 probe 4: does the block (REP) searcher ever find anything?
 *
 * chiron.ts implements `x` = a templated repeat with per-copy variation lists,
 * and ariadne.ts enables it by default (noBlocks defaults to false). Yet
 * chironOpsUsed reports rep=false on every lane measured. Either the pattern is
 * absent from our corpus, or the searcher is starved. This probe separates those
 * two by calling chironFindBlocks directly with a deadline 100x the one the
 * production path allows, and by reporting the near-misses.
 */
import fs from 'node:fs';
import { chironFindBlocks, chironSeparators, chironParseTape, CHIRON_START, CHIRON_SEP } from '@/lib/omega/chiron';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const BLANKS = ['', '', '', '', '', '', '', '\u000e', '\u001f', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '¡', '¢', '£', '¤', '¥', '¦', '¨', '©', 'ª', '«', '¬', '­', '®', '¯', '°', '±', '²', '³', '´', 'µ', '¶', '·', '¸', 'º', '»', '¼', '½', '¾', '¿', '€'];

const files = (process.env.F || '').split(',').filter(Boolean);
const DEAD = Number(process.env.DEAD || 20000);
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const blank = BLANKS.find((c) => countTokens(c, enc) === 1 && !text.includes(c));
  const seps = chironSeparators(text);
  const lines = text.split('\n').length;
  let best = 0, bestSep = '', nBest = 0;
  const perSep: string[] = [];
  for (const sep of seps) {
    const cands = chironFindBlocks(text, blank!, sep, enc, Date.now() + DEAD);
    const g = cands.reduce((s, c) => s + c.gain, 0);
    perSep.push(`${JSON.stringify(sep)}:${cands.length}/${g.toFixed(0)}`);
    if (g > best) { best = g; bestSep = sep; nBest = cands.length; }
  }
  console.log(f.split('/').pop()!.padEnd(38), 'lines', String(lines).padStart(5),
    '| blank', JSON.stringify(blank), '| seps tried', seps.length,
    '| best sep', JSON.stringify(bestSep), 'blocks', String(nBest).padStart(3), 'gain', best.toFixed(0));
  console.log('      per-sep (count/gain):', perSep.join('  '));
}
