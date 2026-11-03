/**
 * Oracle probe: how many tokens does HARD-WRAP LAYOUT cost?
 * content = lines joined by one space (layout destroyed); layout cost is then
 * whatever a per-line side-stream would need. No codec here, a ceiling only.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const T = (s: string) => countTokens(s, enc);
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const raw = T(text);
  const lines = text.split('\n');
  const lead = lines.reduce((n, l) => n + (l.length - l.replace(/^ +/, '').length), 0);
  const content = lines.map((l) => l.trim()).filter(Boolean).join(' ');
  const ct = T(content);
  // a plausible side-stream: per line, its word count (1 token each) + indent diff
  const nonEmpty = lines.filter((l) => l.trim().length).length;
  const blank = lines.length - nonEmpty;
  console.error(`${p}\n  raw ${raw} lines ${lines.length} (blank ${blank}) leadingSpaces ${lead} content-only ${ct} +layout(${nonEmpty}+${blank}) => ${ct + nonEmpty + blank}  (-${raw - ct - nonEmpty - blank})`);
}
