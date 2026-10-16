import { encodeIds } from '@/lib/omega/bpe';
const labels = ['Arabic', 'Cyrillic', 'Hangul', 'Katakana', 'Chinese', 'Myanmar', 'Khmer'];
const tpl: [string, string][] = [
  ['P',  'New {L} letter = rule to next new letter or ¶; expand after ¶.'],
  ['Pp', 'New {L} letter = rule to next new letter or ¶; expand after ¶; print only the result.'],
  ['Ps', 'New {L} letter = rule to next new letter or ¶; expand after ¶; print the result.'],
  ['Pa', 'New {L} letter = rule to next new letter or ¶; expand after ¶; print that.'],
  ['U',  'New {L} letter = rule to next new letter or ¶; print the expansion of ¶.'],
  ['V',  'New {L} letter = rule to next new letter or ¶; print the expanded ¶ part.'],
  ['W',  'New {L} letter = rule to next new letter or ¶; expand after ¶ and print.'],
  ['L2', 'New {L} letter = rule to next new one or ¶; expand after ¶; print only the result.'],
  ['X19','New {L} letter = rule to next new {L} letter or ¶; after ¶ expand recursively; print the expansion.'],
  ['LKD','New {L} letter = rule to next new {L} letter or ¶; after ¶ expand; print the expansion.'],
];
for (const [n, t] of tpl) {
  const row = labels.map(L => `${L}:${encodeIds(t.split('{L}').join(L), 'o200k_base').length}`).join('  ');
  console.log(n.padEnd(5), row, '|', t);
}
