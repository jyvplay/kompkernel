import { countTokens } from '@/lib/omega/bpe';
const ENC: any = 'o200k_base';
const T = (s: string) => countTokens(' ' + s + '; print only.', ENC) - countTokens('; print only.', ENC);
const C = {
  now: 'Δ: mask = a value with digit runs as #. In each R line the first space-token is a signed int; add it to a sum from 0, print the sum into the #s zero-padded to their total width; L lines verbatim. Print.',
  E1: 'Δ: mask = a value with digits as #. R line: first space-token is a signed int, added to a sum from 0; print the sum into the #s, left to right, zero-padded to fill them; L lines verbatim. Print.',
  E2: 'Δ: mask = a value with digits as #; in R lines the first space-token is a signed int added to a running sum from 0, printed into the #s zero-padded to fill them; L lines verbatim. Print.',
  E3: 'Δ: # = a digit, mask = the value shape. In R lines the first space-token is a signed int added to a sum from 0, printed into the #s zero-padded; L lines verbatim. Print.',
  E4: 'Δ: mask = value shape with # per digit. R: add the first space-token (signed int) to a sum from 0 and print it into the #s, zero-padded; L: verbatim. Print.',
};
for (const [k, v] of Object.entries(C)) console.log(k.padEnd(4), T(v));
