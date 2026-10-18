/**
 * X26: contract battery, including deliberately aggressive shortenings.
 *
 * Every other axis measured this turn returned zero (see bench/x26/README.md).
 * The contract is the one lever with a reliably positive yield, it is paid by
 * EVERY message, and it is a larger fraction of a small message -- so it is
 * disproportionately the prose case the brief cares about.
 *
 * Each candidate is scored against the live tokenizer. Admissibility is judged
 * separately: a candidate must still state (1) which characters are names,
 * (2) where the tape is, (3) how entries are delimited, (4) the scope of
 * expansion, (5) recursion when the tape nests, (6) output discipline.
 * Candidates that drop a load-bearing fact are marked UNSAFE and are not
 * candidates no matter how cheap they are.
 */
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const P = '¶';

const V: Array<{ id: string; s: string; safe: boolean; why: string }> = [
  { id: 'A-current', safe: true, why: 'reference',
    s: `Before ${P} a new foreign letter labels text up to the next new letter. After ${P} expand all repeatedly; print result only.` },
  { id: 'B', safe: true, why: 'same facts, tighter',
    s: `Before ${P} a new foreign letter names the text until the next. After ${P} expand repeatedly; print only the result.` },
  { id: 'C', safe: true, why: 'same facts, tighter',
    s: `Before ${P}, new foreign letters name the text up to the next. After ${P} expand repeatedly; print only that.` },
  { id: 'D', safe: true, why: 'same facts',
    s: `Foreign letters before ${P} name the text up to the next. After ${P} expand repeatedly; print only the result.` },
  { id: 'E', safe: true, why: 'same facts',
    s: `Before ${P} a new foreign letter starts a name for the text up to the next. After ${P} expand repeatedly; print only the result.` },
  { id: 'F', safe: true, why: 'uses "stands for"',
    s: `Before ${P} each new foreign letter stands for the text up to the next. After ${P} expand repeatedly; print only the result.` },
  { id: 'G', safe: true, why: 'compact but complete',
    s: `Before ${P}: new foreign letters name the text until the next. After ${P}: expand repeatedly, print only the result.` },
  { id: 'H', safe: true, why: 'compact but complete',
    s: `Before ${P} new foreign letters name the text to the next. After ${P} expand repeatedly; output only the result.` },
  { id: 'I', safe: true, why: 'compact but complete',
    s: `Before ${P} a new foreign letter names all text before the next. After ${P} expand repeatedly; print only the result.` },
  { id: 'J', safe: true, why: 'drops "foreign" -> UNSAFE: latin letters in raws would look like names',
    s: `Before ${P} each new letter names the following text. After ${P} expand repeatedly; print only the result.` },
  { id: 'K', safe: false, why: 'drops output discipline',
    s: `Before ${P} a new foreign letter names the text until the next. After ${P} expand repeatedly.` },
  { id: 'L', safe: false, why: 'drops recursion',
    s: `Before ${P} a new foreign letter names the text until the next. After ${P} expand; print only the result.` },
  { id: 'M', safe: false, why: 'drops delimiter rule',
    s: `Before ${P} foreign letters name text. After ${P} expand repeatedly; print only the result.` },
  { id: 'N', safe: true, why: 'uses "abbreviates"',
    s: `Before ${P} a new foreign letter abbreviates the text up to the next. After ${P} expand repeatedly; print only the result.` },
  { id: 'O', safe: true, why: 'uses "maps to"',
    s: `Before ${P} a new foreign letter maps to the text up to the next. After ${P} expand repeatedly; print only the result.` },
  { id: 'P2', safe: true, why: 'terse but complete',
    s: `Before ${P} new foreign letters name text to the next. After ${P} expand repeatedly; print result only.` },
  { id: 'Q', safe: true, why: 'terse but complete',
    s: `Before ${P} each new foreign letter names text up to the next. After ${P} expand all repeatedly; print only it.` },
  { id: 'R', safe: false, why: 'no output discipline, no recursion',
    s: `Expand the names before ${P}, then print the text after ${P}.` },
  { id: 'S', safe: true, why: 'states it procedurally',
    s: `The part before ${P} defines names: each new foreign letter means the text up to the next. Expand them repeatedly in the part after ${P}; print only the result.` },
  { id: 'U', safe: true, why: 'compact procedural',
    s: `Names: before ${P}, each new foreign letter means the text until the next. Expand repeatedly after ${P}; print only the result.` },
];
console.log('id'.padEnd(10), 'tok'.padStart(4), 'vs A'.padStart(5), 'safe'.padStart(5), '  ' + 'text');
const base = T(V[0].s);
for (const v of V) {
  const t = T(v.s);
  console.log(v.id.padEnd(10), String(t).padStart(4), String(t - base).padStart(5),
    String(v.safe).padStart(5), '  ' + v.s + (v.safe ? '' : '   <-- ' + v.why));
}
