import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
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
for (const p of ['bench/x51/fixtures/od-ls.txt', 'bench/x51/fixtures/od-text.txt']) {
  const tx = fs.readFileSync(p, 'utf8'); const tr = odTransform(tx);
  console.log(JSON.stringify({ lane: p, transform: !!tr, roundTrip: tr ? odRestore(tr.out) === tx : null, lines: tr?.lines, rawTok: T(tx), reducedRawTok: tr ? T(tr.out) : null }));
}
