// Z34: do selected header phrases overlap (suffix of one = prefix of another)? Measures the superstring-style headroom.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { searchS } from '@/lib/omega/veritas-s';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const st = searchS(t, 'o200k_base', { refine: false });
  const P = st.entries.map((e) => e.phrase);
  let pairs = 0, best = 0, savedChars = 0;
  for (let i = 0; i < P.length; i++) for (let j = 0; j < P.length; j++) {
    if (i === j) continue;
    const a = P[i], b = P[j];
    for (let L = Math.min(a.length, b.length) - 1; L >= 4; L--) {
      if (a.slice(-L) === b.slice(0, L)) { pairs++; best = Math.max(best, L); savedChars += L; break; }
    }
  }
  const phraseTokens = P.reduce((s, p) => s + countTokens(p, 'o200k_base'), 0);
  console.log(JSON.stringify({ file: f.split('/').pop(), entries: P.length, overlapPairs: pairs, longestOverlapChars: best, overlapCharsTotal: savedChars, headerPhraseTokens: phraseTokens }));
}
