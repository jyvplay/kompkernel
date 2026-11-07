import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const r: any = tagstackFrontier(text, enc);
  const ts = tokenStrings(r.message, enc);
  let asciiLet = 0, dig = 0, punct = 0, ws = 0, nonAscii = 0, mixed = 0, nonAsciiChars = 0;
  const distinct = new Set<string>();
  for (const { s } of ts) {
    if (/^\s*$/.test(s)) { ws++; continue; }
    if (/^[!-~]+$/.test(s)) {
      if (/^[0-9]+$/.test(s)) dig++;
      else if (/^[A-Za-z]+$/.test(s)) asciiLet++;
      else if (/^[^A-Za-z0-9]+$/.test(s)) punct++;
      else mixed++;
    } else { nonAscii++; nonAsciiChars += [...s].length; for (const c of s) if (c.charCodeAt(0) > 127) distinct.add(c); }
  }
  const T = ts.length;
  console.log(`${p.split('/').pop()!.padEnd(22)} F ${String(T).padStart(5)} | ASCIIword ${String(asciiLet).padStart(4)} digit ${String(dig).padStart(4)} punct ${String(punct).padStart(4)} ws ${String(ws).padStart(3)} mixed ${String(mixed).padStart(4)} | NON-ASCII ${String(nonAscii).padStart(4)} (${(100 * nonAscii / T).toFixed(1)}% of tokens, ${nonAsciiChars} chars, ${distinct.size} distinct)`);
}
