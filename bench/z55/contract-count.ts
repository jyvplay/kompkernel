// z55: o200k token counts of KLADOS contract wordings (readability and cost trade-off).
import { countTokens } from '@/lib/omega/bpe';
const V: Record<string, string> = {
  box_now: 'KLADOS: each line is "depth text". Depth 0: print text. Depth d: print d-1 levels, each "│ + 2 NBSP + space" if that level\'s line has a later sibling else 4 spaces, then "├── " if this line has a later sibling else "└── ", then text. A later sibling = a later line at the same depth before any shallower line.',
  box_b: 'KLADOS "d text": depth d, redraw as tree(1) does: per ancestor level "│\u00a0\u00a0 " if it has later siblings else 4 spaces; then "├── " or "└── " (last sibling). Depth 0: text.',
  box_c: 'KLADOS "d text" = tree(1) at depth d (0 = text alone); bars "│\u00a0\u00a0 " or 4 spaces; then ├── or └──.',
  box_d: 'KLADOS: "d text" = tree(1) line at depth d, 0 = plain text.',
  ascii_b: 'KLADOS "d text": depth d, redraw as npm ls does: per ancestor level "| " if it has later siblings else 2 spaces; then "+-- " or "`-- " (last sibling). Depth 0: text.',
  ascii_c: 'KLADOS "d text" = npm ls line at depth d (0 = text alone); bars "| " or 2 spaces; then +-- or `--.',
};
for (const [k, v] of Object.entries(V)) console.log(JSON.stringify({ k, tokens: countTokens(v, 'o200k_base') }));
