import { countTokens } from '../../src/lib/omega/bpe';
for (const c of [
  "【L】 = the standard text of license L as in GitHub's LICENSE template, after the copyright line.",
  "【L】 = license L's standard text (GitHub's LICENSE template) after the copyright line.",
  "【L】 = the standard text of license L (GitHub's template), after the copyright line.",
  "【L】 = the body of license L (GitHub's LICENSE template, after the copyright line).",
  "【L header】 = L's standard per-file license notice",
  "【L header】 = the standard L notice put at the top of source files",
  'prefix "p" = each following line of it begins with p (blank lines: p without trailing spaces)',
  'prefix "p" = its later lines start with p (blank lines: p right-trimmed)',
  'wrap N = its paragraphs re-flowed greedily to N columns, prefix included',
  'wrap N = its paragraphs re-wrapped greedily at N columns (prefix included)',
]) console.log(String(countTokens(c, 'o200k_base')).padStart(3), c);
