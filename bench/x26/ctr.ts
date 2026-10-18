/**
 * X26: contract minimization.
 *
 * The contract is paid by EVERY message and is pure overhead -- for a 612-token
 * prose wire it is 4% of the total, and it dominates for short messages. PSEPHOS
 * and AETOS both spent their effort on the WIRE and inherited POLYTROPOS's
 * wording verbatim. This probe scores rewrites against the live tokenizer.
 *
 * A rewrite is only admissible if it still states all six load-bearing facts
 * (enumerated in src/lib/omega/syntomia.ts):
 *   1. which characters are rule names
 *   2. where the tape is
 *   3. how entries are delimited
 *   4. the scope of expansion
 *   5. recursion, only when the tape nests
 *   6. output discipline
 * Decodability of the winner is checked separately by hand (the agent decodes a
 * real wire using only the contract).
 */
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const P = '¶';

const VARIANTS: Array<{ id: string; nested: string; flat: string }> = [
  { id: 'V0-current',
    nested: `Before ${P} a new foreign letter labels text up to the next new letter. After ${P} expand all repeatedly; print result only.`,
    flat:   `Before ${P} a new foreign letter labels text up to the next new letter. After ${P} expand all; print result only.` },
  { id: 'V1',
    nested: `Before ${P} each new foreign letter labels the text up to the next new letter. After ${P} expand all repeatedly; print only the result.`,
    flat:   `Before ${P} each new foreign letter labels the text up to the next new letter. After ${P} expand all; print only the result.` },
  { id: 'V2',
    nested: `Before ${P} a new foreign letter names the text until the next. After ${P} expand repeatedly; print only the result.`,
    flat:   `Before ${P} a new foreign letter names the text until the next. After ${P} expand; print only the result.` },
  { id: 'V3',
    nested: `Each new foreign letter before ${P} names the text after it until the next new letter. After ${P} expand repeatedly; print only the result.`,
    flat:   `Each new foreign letter before ${P} names the text after it until the next new letter. After ${P} expand; print only the result.` },
  { id: 'V4',
    nested: `New foreign letters before ${P} each name the text up to the next one. After ${P} expand repeatedly; output only the result.`,
    flat:   `New foreign letters before ${P} each name the text up to the next one. After ${P} expand; output only the result.` },
  { id: 'V5',
    nested: `Letters before ${P} are names for the text following each, up to the next. After ${P} expand repeatedly; print only the result.`,
    flat:   `Letters before ${P} are names for the text following each, up to the next. After ${P} expand; print only the result.` },
  { id: 'V6-minimal',
    nested: `Before ${P} each new letter names the following text. After ${P} expand repeatedly; print only the result.`,
    flat:   `Before ${P} each new letter names the following text. After ${P} expand; print only the result.` },
  { id: 'V7-colon',
    nested: `Before ${P}: each new foreign letter defines the text until the next. After ${P}: expand repeatedly, print only the result.`,
    flat:   `Before ${P}: each new foreign letter defines the text until the next. After ${P}: expand, print only the result.` },
  { id: 'V8',
    nested: `Before ${P} a new foreign letter begins a definition running to the next new letter. After ${P} expand every definition repeatedly; print only the result.`,
    flat:   `Before ${P} a new foreign letter begins a definition running to the next new letter. After ${P} expand every definition; print only the result.` },
  { id: 'V9-terse',
    nested: `Before ${P}, new foreign letters name the text up to the next. After ${P} expand repeatedly; print only that.`,
    flat:   `Before ${P}, new foreign letters name the text up to the next. After ${P} expand; print only that.` },
  { id: 'V10-keys',
    nested: `Before ${P} each new foreign letter is a key for the text up to the next key. After ${P} expand keys repeatedly; print only the result.`,
    flat:   `Before ${P} each new foreign letter is a key for the text up to the next key. After ${P} expand keys; print only the result.` },
  { id: 'V11-stands',
    nested: `Before ${P} a new foreign letter stands for the text up to the next new letter. After ${P} substitute repeatedly; print only the result.`,
    flat:   `Before ${P} a new foreign letter stands for the text up to the next new letter. After ${P} substitute; print only the result.` },
];

console.log('id'.padEnd(14), 'nested'.padStart(7), 'flat'.padStart(6), '  text(nested)');
for (const v of VARIANTS) {
  console.log(v.id.padEnd(14), String(T(v.nested)).padStart(7), String(T(v.flat)).padStart(6), '  ' + v.nested);
}
