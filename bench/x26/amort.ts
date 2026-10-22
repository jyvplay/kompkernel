/**
 * X26: CLAUSE AMORTIZATION.
 *
 * The binding constraint on every small mechanism is the contract, not the wire.
 * Each new RULE costs its own sentence, and a sentence in this contract costs
 * 8-25 tokens. So a mechanism yielding 4 tokens/lane -- which is what the LEXIS
 * derivable-space fold still yields ON THE WIRE after the grammar has eaten the
 * easy cases -- can never ship, because its clause costs more than it saves.
 *
 * PSEPHOS and AETOS each paid a full standalone sentence. This probe measures
 * the INCREMENTAL cost of folding a family into an existing sentence instead:
 * the base clause already establishes ¶, the tape, expansion and output
 * discipline, so adding "and add a space after each . , ;" to it should cost
 * less than a fresh "After every . , ; put a space." sentence.
 */
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const P = '¶';

const BASE = `Before ${P} a new foreign letter labels text up to the next new letter. After ${P} expand all repeatedly; print result only.`;
const EXT: Array<{ id: string; tail: string }> = [
  { id: 'none',        tail: '' },
  { id: 'sp',          tail: ` Add a space after each . , ; : ! ? that lacks one.` },
  { id: 'sp-short',    tail: ` Space after each . , ; : ! ?.` },
  { id: 'sp-tersest',  tail: ` Space after . , ; : ! ?.` },
  { id: 'sp-inline',   tail: ` and add a space after each . , ; : ! ?` },
  { id: 'sp-inline2',  tail: ` and put a space after every . , ; : ! ?` },
  { id: 'sp-inline3',  tail: `, spacing after . , ; : ! ?` },
];
console.log('=== incremental contract cost (base = ' + T(BASE) + ' tokens) ===');
for (const e of EXT) {
  const inlined = BASE.replace('; print result only.', e.tail + '; print result only.');
  console.log('  ' + e.id.padEnd(12),
    'append', String(T(BASE + e.tail) - T(BASE)).padStart(4),
    '| inline', String(T(inlined) - T(BASE)).padStart(4),
    '| total', String(T(BASE + e.tail)).padStart(3),
    '|', e.tail.trim() || '(base only)');
}

// ---- per-lane yield of the derivable-space fold, measured ON THE WIRE ----
const PUN = /([.,;:!?])(?=[^\s])/g;
const lanes = fs.readFileSync('bench/x21/lanes.txt', 'utf8').trim().split('\n');
console.log('\n=== derivable-space fold, measured on the WIRE (positive = saves) ===');
let tot = 0;
const rows: Array<[string, number, number]> = [];
for (let i = 0; i < lanes.length; i++) {
  const wf = `bench/x24/wires/${(i + 1).toString().padStart(2, '0')}.wire`;
  if (!fs.existsSync(wf)) continue;
  const w = fs.readFileSync(wf, 'utf8');
  const n = (w.match(PUN) || []).length;
  if (!n) continue;
  const b = T(w);
  const d = b - T(w.replace(PUN, '$1 '));
  rows.push([lanes[i].split('/').pop()!, n, d]);
  tot += d;
}
rows.sort((a, b) => b[2] - a[2]);
for (const [n, c, d] of rows) console.log('  ' + n.padEnd(40), 'sites', String(c).padStart(5), 'net', String(d).padStart(5));
console.log('  TOTAL across lanes:', tot, ' over', rows.length, 'lanes =>', (tot / rows.length).toFixed(1), 'per lane');
