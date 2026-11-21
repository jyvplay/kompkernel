// X149 measured headroom probe (diagnosis, not a codec): over the ACCEPTED
// frontier messages, how many substitution targets remain that a glyph rule
// could profit from at all, and where? Reachability rule: a rule saves tokens
// only if the substring costs >=2 tokens at an occurrence, or changes neighbor
// merges; its one-time cost is glyph+value tokens.
import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
const rows = fs.readFileSync('bench/x149/receipts/frontier.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l)) as any[];
const out: any = [];
for (const r of rows) {
  const m: string = r.message;
  const at = m.indexOf('§'), end = m.indexOf('¶', at);
  const body = at >= 0 && end > at ? m.slice(end + 1) : m;
  // tokenize whole message once; count occurrences of each distinct token string
  const toks = tokenStrings(m, 'o200k_base');
  const occ = new Map<string, number>();
  for (const t of toks) occ.set(t.s, (occ.get(t.s) ?? 0) + 1);
  // a distinct token string with occ>=2 that costs 1 token when repeated:
  // merging occurrences into a rule saves nothing per occurrence (glyph=1 token)
  // unless context merges. So count instead: distinct token strings of length>=8
  // with occ>=2 (a phrase spanning boundaries — tape candidates) and the total
  // repeat mass: sum over s, max(0, occ(s)-1) (an upper bound on removable
  // tokens if every repeated token string were free to delete).
  let repeatMass = 0, phraseKinds = 0, phraseMass = 0;
  for (const [s, c] of occ) {
    if (c >= 2) { repeatMass += (c - 1); if (s.length >= 8) { phraseKinds++; phraseMass += (c - 1); } }
  }
  const digits = [...m].filter((c) => c >= '0' && c <= '9').length;
  out.push({ path: r.path, tokens: r.tokens, distinct: occ.size, repeatMass, phraseKinds, phraseMass, digitChars: digits });
}
fs.writeFileSync('bench/x149/receipts/headroom.json', JSON.stringify(out, null, 1));
console.log(out.map((o: any) => `${o.path.split('/').pop()}: tok=${o.tokens} distinct=${o.distinct} repeatMass=${o.repeatMass} phraseKinds=${o.phraseKinds} digitChars=${o.digitChars}`).join('\n'));
