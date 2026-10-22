import { countTokens } from '@/lib/omega/bpe';
const groups: [string, string[]][] = [
  ['decimal padding', ['17.240000','17.24','0.000000','0.0','1234.560000','1234.56']],
  ['thousands', ['1,234,567','1234567','1,000','1000']],
  ['clock', ['13:53:08','135308','09:59:52','095952','07:59','0759']],
  ['url', ['https://github.com/a/b','§github.com/a/b','http://x.y','¶x.y']],
  ['uuid', ['123e4567-e89b-12d3-a456-426614174000','123e4567e89b12d3a456426614174000']],
  ['xml', ['</g>','</>','</svg>','<g>']],
  ['hex', ['#1a2b3c','1a2b3c']],
  ['iso', ['2026-10-16','20261016','1990-01-02','19900102']],
  ['space runs', ['a  b','a|b','a   c','a\tb']],
  ['trailing zeros int', ['1000','1,000','10000','10,000']],
];
for (const [g, xs] of groups) {
  console.log('## ' + g);
  for (const x of xs) console.log('   ' + String(countTokens(x, 'o200k_base')).padStart(3) + '  ' + JSON.stringify(x));
}
