import { countTokens } from '@/lib/omega/bpe';
const samples = [
  '-118.2739756', '2739756', '~2739756', '739756', '-118.', '34.0592814', '0592814',
  '18,442.17', '18442.17', '2026-08-14', '20260814',
  '77.44539475', '77.44', '44539475',
  '<div align="center">', '<div align=center>',
  'user=alice', 'user=bob',
  '  action=login', '  action=logout',
];
for (const s of samples) console.log(String(countTokens(s, 'o200k_base')).padStart(3), JSON.stringify(s));
