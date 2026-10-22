import { encode } from 'gpt-tokenizer';
const t = (s: string) => encode(s).length;
const cases = [
  'src/omega/anadiplosis.ts',
  'src_omega_anadiplosis.ts',
  'src omega anadiplosis.ts',
  'bench/holdout-ops/git-numstat.txt',
  'bench holdout-ops git-numstat.txt',
  'node_modules/@babel/code-frame/lib/index.js',
  'node_modules @babel code-frame lib index.js',
];
for (const c of cases) console.log(String(t(c)).padStart(3), JSON.stringify(c));
