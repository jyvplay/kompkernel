// X52: measure ONE parent on od fixture (orig|reduced). Transform = X51-verified
// od gutter/offset elision (round-trip asserted here again).
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
const ENC = 'o200k_base' as const; const T = (s: string) => countTokens(s, ENC);
const OD_LINE = /^([0-9a-f]{6,})((?: [0-9a-f]{2})+) +>(.*)<$/;
function odTransform(tx: string): { out: string; lines: number } | null {
  const lines = tx.split('\n'); const out: string[] = []; let n = 0;
  for (const l of lines) { const m = OD_LINE.exec(l);
    if (m) { out.push(m[2]!.trim()); n++; } else if (l === '' || /^[0-9a-f]{6,}$/.test(l) || l.startsWith('#')) out.push(l); else return null; }
  return { out: out.join('\n'), lines: n };
}
function odRestore(tx: string): string {
  const lines = tx.split('\n'); const fin = [...lines].reverse().find(l => /^[0-9a-f]{6,}$/.test(l)); const width = fin ? fin.length : 6;
  const out: string[] = []; let idx = 0;
  for (const l of lines) { if (/^(?:[0-9a-f]{2} )*[0-9a-f]{2}$/.test(l)) { const bytes = l.split(' ').map(h => parseInt(h, 16));
      const hexPart = bytes.map(b => ' ' + b.toString(16).padStart(2, '0')).join('');
      const gutter = bytes.map(b => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.')).join('');
      out.push(`${(idx * 16).toString(16).padStart(width, '0')}${hexPart}${' '.repeat(3 * (16 - bytes.length))}  >${gutter}<`); idx++; } else out.push(l); }
  return out.join('\n');
}
export const OD_CONTRACT = 'Each line lists 16 bytes in hex (the last may be fewer). Rewrite every such line as an od line: the byte offset in hex (line number counting from 0, times 16), padded with zeros to the width of the final offset line, then the bytes in hex each preceded by a space, then spaces so the gutter aligns as if 16 bytes were present, then two spaces, then > then one character per byte (the ASCII character itself when printable, else a dot) then <. Keep other lines unchanged.';
const [parent, which, lane] = process.argv.slice(2) as [string, string, string];
const text = fs.readFileSync(lane, 'utf8');
const tr = odTransform(text); if (!tr) throw new Error('no transform');
if (odRestore(tr.out) !== text) throw new Error('round trip');
const tx = which === 'reduced' ? tr.out : text;
const t0 = Date.now(); let tokens: number;
if (parent === 'daedalus') { const d = daedalusEncode(tx, ENC); if (!d.exact || d.decoded !== tx) throw new Error('dae'); tokens = d.messageTokens; }
else if (parent === 'ako2') { const a = akolouthia2Encode(tx, ENC); if (!a.exact || a.decoded !== tx) throw new Error('ako'); tokens = T(a.decoderPrompt); }
else if (parent === 'apographe') { const g: any = apographeEncode(tx, ENC); if (apographeDecodeResult(g) !== tx) throw new Error('apo'); tokens = T((g.contract ? g.contract + '\n' : '') + g.wire); }
else throw new Error('parent?');
console.log(JSON.stringify({ lane, parent, which, tokens, ms: Date.now() - t0, contractTok: T(OD_CONTRACT), rawTok: T(text), reducedRawTok: T(tr.out) }));
