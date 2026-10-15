// z54: UPPER-BOUND probe (not a codec). Blank the fields a published convention would derive, measure the
// frontier on original vs blanked text. The difference bounds what derivation can save before the rule's own cost.
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
const enc = 'o200k_base' as const;
const mode = process.env.BLANK ?? 'gh';
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  let t2 = text;
  let n = 0;
  if (mode === 'gh') t2 = text.replace(/"((?:[a-z_]*_)?url)": "https:\/\/(api\.github\.com|github\.com|avatars\.githubusercontent\.com)[^"]*"/g, (_m, k) => { n++; return `"${k}": ""`; });
  if (mode === 'npm') t2 = text.replace(/"resolved": "https:\/\/registry\.npmjs\.org\/[^"]*"/g, () => { n++; return `"resolved": ""`; });
  const a: any = daedalusEncode(text, enc);
  const b: any = daedalusEncode(t2, enc);
  console.log(JSON.stringify({ lane: f.split('/').pop(), mode, fieldsBlanked: n, raw: a.inTokens, frontierM: a.messageTokens, blankedRawTokens: b.inTokens, blankedM: b.messageTokens, upperBoundSaving: a.messageTokens - b.messageTokens, exactOrig: a.exact, exactBlank: b.exact }));
}
