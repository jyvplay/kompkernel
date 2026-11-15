import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
const keys = [
  'X115. Body first. Then Tnnnn at line start before space = T + symbolic chmod nnnn. Print only.',
  'X115. Body first. Line-start Tnnnn␠ = T + symbolic chmod nnnn. Print only.',
  'X115. Body first. Line-start Tnnnn␠ is T plus ls -l mode for octal nnnn. Print only.',
  'X115. Body first. Tnnnn␠ at line start = T + chmod nnnn symbolic. Print only.',
  'X115. Body first. Tnnnn␠ at line start = T + ls -l mode nnnn. Print only.',
  'X115. Body first. Tnnnn␠ at line start = T + symbolic mode nnnn. Print only.',
  'X115. Body first. Tnnnn␠ at line start = T + octal mode nnnn expanded. Print only.',
  'X115. Body first. Expand line-start Tnnnn␠ as T + symbolic chmod nnnn. Print only.',
  'X115. Body first. Expand Tnnnn␠ at line start to T + symbolic chmod nnnn. Print only.',
  'Body first. X115: Tnnnn␠ at line start = T + symbolic chmod nnnn. Print only.',
  'X115. Body first. Tnnnn␠ line-start = T+symbolic chmod nnnn. Print only.',
  'X115. Body first. Tnnnn␠ line-start = T+ls -l mode nnnn. Print only.',
  'X115. Body first. Tnnnn␠ line-start = T+chmod nnnn. Print only.',
  'X115. Body first. Tnnnn␠ line-start = T+mode nnnn. Print only.',
  'X115. Body first. Tnnnn␠ line-start = T+octal nnnn mode. Print only.',
  'X115. Body first. Tnnnn␠ line-start = T+octal nnnn. Print only.',
  'X115. Body first. Tnnnn␠ line-start: T+symbolic nnnn. Print only.',
  'X115. Body first. Tnnnn␠ line-start: T+chmod nnnn. Print only.',
];
for (const k of keys) console.log(countTokens(k, enc), k);
