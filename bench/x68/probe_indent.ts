import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const lines = t.split('\n');
  const stripped = lines.map(l => l.replace(/^[ \t]+/, '')).join('\n');
  const raw = countTokens(t, enc), st = countTokens(stripped, enc);
  // how much of the leading whitespace is derivable from brace depth?
  let depth = 0, ok = 0, bad = 0, units = new Set<number>();
  const reparsed: string[] = [];
  for (const l of lines) {
    const body = l.replace(/^[ \t]+/, '');
    const lead = l.slice(0, l.length - body.length);
    const guess = '  '.repeat(Math.max(0, depth));
    if (lead === guess) ok++; else bad++;
    reparsed.push(guess + body);
    // naive brace counting on the stripped body, ignoring strings
    const opens = (body.match(/[{(\[]/g) || []).length;
    const closes = (body.match(/[})\]]/g) || []).length;
    depth = Math.max(0, depth + opens - closes);
  }
  const rejoinOk = reparsed.join('\n') === t;
  console.log(JSON.stringify({ f, chars: t.length, raw, stripped: st, indentGain: raw - st, gainPct: +(((raw - st) / raw) * 100).toFixed(1), lines: lines.length, indentOk: ok, indentBad: bad, rejoinOk, bytesOfIndent: lines.reduce((a, l) => a + (l.length - l.replace(/^[ \t]+/, '').length), 0) }));
}
