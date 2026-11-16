import { countTokens } from '../../src/lib/omega/bpe';
const C = [
 '‡: the next k lines are records; line 1 sets each column width (R = pad left); the rest list the same fields joined by one space. Re-pad them, then drop this line.',
 '‡: next k lines: line 1 sets column widths, R = pad left; the rest give the same fields joined by single spaces. Re-pad, then drop this line.',
 '‡: k records follow. Line 1 sets each column width (R = pad left); the rest give those fields joined by single spaces. Re-pad each, then drop this line.',
 'After ‡: k records; line 1 sets column widths, R pad-left; rest are its fields single-spaced. Re-pad, drop this line.',
 '‡ k lines: line 1 fixes column widths, R = pad left; others: same fields, single-spaced. Re-pad; drop this line.',
 '‡: k records, line 1 gives column widths, R = pad left, rest = same fields single-spaced; re-pad and drop this line.',
 '‡: k records; first sets column widths (R = pad left); rest are the same fields space-joined; re-pad, drop this line.',
 '‡ k records: line 1 sets column widths, R means pad left, the rest are those fields joined by single spaces. Re-pad them and drop this line.',
];
for (const c of C) console.log(String(countTokens(c + '\n', 'o200k_base')).padStart(3), c);
