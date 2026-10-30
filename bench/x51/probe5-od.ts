// X51 probe 5 (od-only rerun of probe4b's od lanes after probe4b was stopped for CPU contention).
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
const ENC = 'o200k_base' as const;
const T = (s: string) => countTokens(s, ENC);
function parents(text: string) {
  const all: Record<string, number> = {}; const ms: Record<string, number> = {};
  let t0 = Date.now(); const d = daedalusEncode(text, ENC); ms.daedalus = Date.now() - t0; if (!d.exact || d.decoded !== text) throw new Error('dae'); all.daedalus = d.messageTokens;
  t0 = Date.now(); const a = akolouthia2Encode(text, ENC); ms.ako2 = Date.now() - t0; if (!a.exact || a.decoded !== text) throw new Error('ako'); all.ako2 = countTokens(a.decoderPrompt, ENC);
  t0 = Date.now(); const g: any = apographeEncode(text, ENC); ms.apographe = Date.now() - t0; if (apographeDecodeResult(g) !== text) throw new Error('apo'); all.apographe = T((g.contract ? g.contract + '\n' : '') + g.wire);
  return { all, ms, min: Math.min(...Object.values(all)) };
}
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
const OD_CONTRACT = 'Each line lists 16 bytes in hex (the last may be fewer). Rewrite every such line as an od line: the byte offset in hex (line number counting from 0, times 16), padded with zeros to the width of the final offset line, then the bytes in hex each preceded by a space, then spaces so the gutter aligns as if 16 bytes were present, then two spaces, then > then one character per byte (the ASCII character itself when printable, else a dot) then <. Keep other lines unchanged.';

for (const p of ['bench/x51/fixtures/od-ls.txt', 'bench/x51/fixtures/od-text.txt']) {
  const tx = fs.readFileSync(p, 'utf8'); const tr = odTransform(tx);
  if (!tr) { console.log(JSON.stringify({ lane: p, noTransform: true })); continue; }
  const rt = odRestore(tr.out) === tx;
  const orig = parents(tx); const red = parents(tr.out);
  console.log(JSON.stringify({ lane: p, roundTrip: rt, lines: tr.lines, rawTok: T(tx), reducedRawTok: T(tr.out), contractTok: T(OD_CONTRACT), origParents: orig, reducedParents: red, candidateTotal: red.min + T(OD_CONTRACT) + 1, deltaVsParentsMin: red.min + T(OD_CONTRACT) + 1 - orig.min }, null, 2));
}
