// Z34: price alternative legend lines (o200k tokens). Pricing only; readability is not measured here.
import { countTokens } from '@/lib/omega/bpe';
const L: Record<string, string> = {
  current: '# VXS: header lines "XT": bare X means T (T may hold other X); ~~ ~, ~N newline, ~R CR; ]] ends',
  shorter: '# VXS: "XT" = X means T (nested ok); ~~ is ~; ~N newline; ~R CR; ]] ends',
  short2: '# VXS: X=T in header; X in text means T; ~~ ~, ~N nl, ~R cr; ]] ends',
  min: '# X=T defines X; ~~=~ ~N=nl ~R=cr; ]] ends header',
};
for (const [k, v] of Object.entries(L)) console.log(JSON.stringify({ name: k, tokens: countTokens(v, 'o200k_base'), text: v }));
