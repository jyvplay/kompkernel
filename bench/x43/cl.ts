import { countTokens } from '@/lib/omega/bpe';
const ENC: any = 'o200k_base';
const C = {
  cur: 'Δ wire: line 1 = Δ¦mask¦j¦eol¦pattern. mask: a value with each digit run as #s of that length. Body lines in pattern order: L verbatim; R: replace the first token (space-separated) by a signed whole number, add it to a running total starting at 0, write the total as decimal digits padded with leading 0 to the mask\'s total digit count, then fill the # runs left to right. Print.',
  A: 'Δ: header = Δ¦mask¦j¦s/E¦pattern, mask = a value with digit runs as #s. Each R body line: its j-th space-token is a signed int; add it to a total from 0; write the total in the # slots, 0-padded to their total width, fill left to right. L lines verbatim. Print.',
  B: 'Δ header: mask = value with #s for digit runs, j = which space-token, pattern = R/L runs. R line: add its j-th token (signed int) to a running total from 0, write the total in the # slots 0-padded to their total width. L lines verbatim. Print.',
  C: 'Δ mask: # = a digit, j = token index. In an R line, add the j-th space-token (a signed int) to a running total from 0, then write the total into the # slots, zero-padded to their total width. L lines verbatim. Print.',
  D: 'Δ: mask shows digit runs as #; in R lines the j-th space-token is a signed int added to a running sum from 0, printed into the #s zero-padded; L lines verbatim. Print.',
};
for (const [k, v] of Object.entries(C)) console.log(k.padEnd(4), countTokens(' ' + v + '; print only.', ENC), '(tail-only subtract):', countTokens(' ' + v + '; print only.', ENC) - countTokens('; print only.', ENC));
