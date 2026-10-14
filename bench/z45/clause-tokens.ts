import { countTokens } from '../../src/lib/omega/bpe';
import { canonClause, formatRef, type CanonRef } from '../../src/lib/omega/anagnorisis';
const enc = 'o200k_base';
const refs: Record<string, CanonRef[]> = {
  'text only': [{ id: 'MIT', kind: 'text', slots: [], prefix: '', crlf: false }],
  'text+slot': [{ id: 'Apache-2.0', kind: 'text', slots: ['2026 OpenAI'], prefix: '', crlf: false }],
  'header+prefix': [{ id: 'Apache-2.0', kind: 'header', slots: [], prefix: '# ', crlf: false }],
  'header+prefix+wrap': [{ id: 'Apache-2.0', kind: 'header', slots: [], prefix: ' * ', wrap: 100, crlf: false }],
  'text+layout': [{ id: 'MIT', kind: 'text', layout: 'classic', slots: [], prefix: '', crlf: false }],
  'text+unwrapped': [{ id: 'MIT', kind: 'text', slots: [], prefix: '', wrap: Infinity, crlf: false }],
  'header+prefix+url+indent': [{ id: 'Apache-2.0', kind: 'header', slots: [], prefix: ' * ', url: 'https', indent: 5, crlf: false }],
  'everything': [{ id: 'MIT', kind: 'text', layout: 'classic', slots: ['x'], prefix: '# ', wrap: 80, url: 'https', indent: 5, crlf: true }, { id: 'Apache-2.0', kind: 'header', slots: [], prefix: '', wrap: Infinity, crlf: false }],
};
for (const [k, r] of Object.entries(refs)) {
  const c = canonClause(r);
  console.log(`${k.padEnd(26)} clause=${countTokens(c + '\n', enc)} ref=${countTokens(r.map(formatRef).join(''), enc)}  ${c}`);
  console.log(' '.repeat(28) + r.map(formatRef).join(' '));
}
for (const b of ['【MIT】', '«MIT»', '⟨MIT⟩', '⟦MIT⟧', '[[MIT]]', '{{MIT}}', '《MIT》', '【Apache-2.0 header; prefix "# "】', '«Apache-2.0 header; prefix "# "»', '⟦Apache-2.0 header; prefix "# "⟧']) console.log(b.padEnd(40), countTokens(b, enc));
