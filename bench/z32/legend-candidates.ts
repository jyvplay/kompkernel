// Z32: token cost of candidate VXC legend wordings. Each candidate must state: line "XT" defines alias X as T,
// bare X in the body means T, T may contain other aliases (nesting), ~~ ~ escape, ~N newline, ~R CR, header end.
import { countTokens } from '@/lib/omega/bpe';
const cands: [string, string][] = [
  ['E (previous, no nesting rule)', '# VXC: header lines "XT": bare X means T; ~~ ~, ~N newline, ~R CR; ]] ends header'],
  ['F', '# VXC: header lines "XT": bare X means T (T may hold other X); ~~ ~, ~N newline, ~R CR; ]] ends'],
  ['G', '# VXC: header lines "XT": bare X means T, and T may use other X; ~~ is ~, ~N newline, ~R CR; ]] ends'],
  ['H', '# VXC: header "XT" lines: bare X means T (T may hold other X); ~~ ~; ~N newline ~R CR; ]] ends header'],
];
for (const [n, s] of cands) console.log(String(countTokens(s, 'o200k_base')).padStart(4), n, JSON.stringify(s));
