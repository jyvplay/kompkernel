// Candidate VX legends: token cost and whether each one states every rule the decoder needs.
import { countTokens } from '@/lib/omega/bpe';
const cands = [
  '# VX1 key: ~k=T binds key k to text T (in T: ~N=newline, ~R=CR, ~~=~); in the body ~k -> T and ~~ -> ~; the header ends at ]]; no header -> literal',
  '# VX1: ~k=T binds key k to T; body: ~k -> T, ~~ -> ~. In T: ~N newline, ~R CR, ~~ ~. Header ends at ]].',
  '# VX1: ~k=T defines k. Body: ~k->T, ~~->~. In T: ~N=newline ~R=CR ~~=~.',
  '# VX1: ~k=T defines k; body ~k->T; ~~->~; in T ~N ~R ~~ escape newline CR tilde',
  '# VX1: ~k=T; body ~k->T; ~~ is ~; in T: ~N newline ~R CR ~~ ~',
];
for (const c of cands) console.log(countTokens(c, 'o200k_base'), c.length, c.slice(0, 60));
