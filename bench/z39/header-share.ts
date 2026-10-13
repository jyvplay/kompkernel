// Z39: where do the tokens of a VERITAS-P wire go? legend / header (key lines) / terminator / body, exact o200k counts
// (each piece counted on its own; the sum is compared with the whole wire to report the boundary error).
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { veritasPSearch, DEFAULT_VXP_OPTS } from '@/lib/omega/veritas-p';
import { wireR, VXR_LEGEND } from '@/lib/omega/veritas-r';
import { escHeader, VXR_SENTINEL } from '@/lib/omega/veritas-a';
import { nestedHeaderPhrases } from '@/lib/omega/veritas-n';
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const s = veritasPSearch(text, 'o200k_base', DEFAULT_VXP_OPTS);
  const { entries, body } = s.state;
  const whole = countTokens(wireR(entries, body), 'o200k_base');
  const nh = nestedHeaderPhrases(entries);
  const headerLines = entries.map((e) => e.key + escHeader(nh.get(e.key)!));
  const headerCount = countTokens(headerLines.join('\n') + '\n', 'o200k_base');
  const bodyCount = countTokens(body, 'o200k_base');
  const legendCount = countTokens(VXR_SENTINEL + VXR_LEGEND + '\n', 'o200k_base');
  const keysOnly = countTokens(entries.map((e) => e.key).join(''), 'o200k_base');
  const phraseOnly = countTokens(entries.map((e) => escHeader(nh.get(e.key)!)).join('\n'), 'o200k_base');
  console.log(JSON.stringify({ f: f.split('/').pop(), entries: entries.length, whole, legendLine: legendCount, headerLines: headerCount, phrasesInHeader: phraseOnly, keyChars: keysOnly, body: bodyCount, sumParts: legendCount + headerCount + bodyCount, headerShare: +(headerCount / whole).toFixed(3) }));
}
