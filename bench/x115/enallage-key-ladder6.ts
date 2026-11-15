import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
const keys = [
  'X115. Body first. ^Tnnnn␠→T+chmod nnnn.',
  'X115. Body first. ^Tnnnn␠→T+chmod.',
  'X115. Body first. ^Tnnnn␠→chmod nnnn.',
  'X115. Body first. ^Tnnnn␠→chmod.',
  'X115. Body first. ^Tnnnn␠=T+chmod nnnn.',
  'X115. Body first. ^Tnnnn␠=T+chmod.',
  'X115. Body first. ^Tnnnn␠:T+chmod nnnn.',
  'X115. Body first. ^Tnnnn␠:T+chmod.',
  'X115. After body, ^Tnnnn␠→T+chmod nnnn.',
  'X115. After body, ^Tnnnn␠→T+chmod.',
  'X115. ^Tnnnn␠→T+chmod nnnn after body.',
  'X115. ^Tnnnn␠→T+chmod after body.',
  'X115. Body first. ^Tnnnn␠→T+mode.',
  'X115. Body first. ^Tnnnn␠→T+ls.',
  'X115. Body first. ^Tnnnn␠→T+rwx.',
  'X115. Body first. ^Tnnnn␠→T+nnnn.',
  'X115. Body first. ^Tnnnn␠→T+octal.',
  'X115. Body first. ^Tnnnn␠→T+symbolic.',
  'X115. Body first. ^Tnnnn␠→T+expand.',
  'X115. Body first. ^Tnnnn␠→T+decode.',
  'X115. Body first. ^Tnnnn␠→T+perms.',
  'X115. Body first. ^Tnnnn␠→T+perm.',
  'X115. Body first. ^Tnnnn␠→T+stat.',
  'X115. Body first. ^Tnnnn␠→T+unix.',
];
for (const k of keys) console.log(countTokens(k, enc), k);
