import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
const keys = [
  'Body first. ^Tnnnn␠→T+chmod nnnn.',
  'Body first. ^Tnnnn␠→T+chmod.',
  'Body first. ^Tnnnn␠=T+chmod nnnn.',
  'Body first. ^Tnnnn␠=T+chmod.',
  'Body first. ^Tnnnn␠:T+chmod nnnn.',
  'Body first. ^Tnnnn␠:T+chmod.',
  'Body first. ^Tnnnn␠→chmod nnnn.',
  'Body first. ^Tnnnn␠→chmod.',
  'E. Body first. ^Tnnnn␠→T+chmod nnnn.',
  'E. Body first. ^Tnnnn␠→T+chmod.',
  'X. Body first. ^Tnnnn␠→T+chmod nnnn.',
  'X. Body first. ^Tnnnn␠→T+chmod.',
  'Ⓔ. Body first. ^Tnnnn␠→T+chmod nnnn.',
  'Ⓔ. Body first. ^Tnnnn␠→T+chmod.',
  'Body first. ^Tnnnn␠→T+chmod(nnnn).',
  'Body first. ^Tnnnn␠=chmod(nnnn).',
  'Body first. ^Tnnnn␠:chmod(nnnn).',
  'Body first. ^Tnnnn␠→chmod(nnnn).',
  'Body first. ^Tnnnn␠→T+mode nnnn.',
  'Body first. ^Tnnnn␠→T+mode.',
  'Body first. ^Tnnnn␠→T+perms nnnn.',
  'Body first. ^Tnnnn␠→T+perms.',
  'Body first. ^Tnnnn␠→T+nnnn chmod.',
  'Body first. ^Tnnnn␠→T+nnnn mode.',
];
for (const k of keys) console.log(countTokens(k, enc), k);
