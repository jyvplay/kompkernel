// X51 probe 4b: airport FD + od lanes, parents {APOGRAPHE, AKOLOUTHIA-2, DAEDALUS} with per-parent timing.
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
const ENC = 'o200k_base' as const; const T = (s: string) => countTokens(s, ENC);
function parents(text: string, tag: string) {
  const all: Record<string, number> = {}; const ms: Record<string, number> = {};
  let t0 = Date.now(); const d = daedalusEncode(text, ENC); ms.daedalus = Date.now() - t0; if (!d.exact || d.decoded !== text) throw new Error('dae'); all.daedalus = d.messageTokens;
  t0 = Date.now(); const a = akolouthia2Encode(text, ENC); ms.ako2 = Date.now() - t0; if (!a.exact || a.decoded !== text) throw new Error('ako'); all.ako2 = countTokens(a.decoderPrompt, ENC);
  t0 = Date.now(); const g: any = apographeEncode(text, ENC); ms.apographe = Date.now() - t0; if (apographeDecodeResult(g) !== text) throw new Error('apo'); all.apographe = T((g.contract ? g.contract + '\n' : '') + g.wire);
  const who = Object.entries(all).sort((x, y) => x[1] - y[1])[0]!;
  console.log(JSON.stringify({ tag, all, ms }));
  return { min: who[1], who: who[0], all };
}
function splitCsvLine(line: string, delim: string): { fields: string[]; values: string[] } | null {
  const fields: string[] = []; const values: string[] = []; let i = 0; const n = line.length;
  while (true) { let j = i; let val = '';
    if (line[j] === '"') { j++; let closed = false;
      while (j < n) { if (line[j] === '"') { if (line[j+1] === '"') { val += '"'; j += 2; } else { j++; closed = true; break; } } else val += line[j++]; }
      if (!closed) return null;
    } else { while (j < n && line[j] !== delim) val += line[j++]; }
    fields.push(line.slice(i, j)); values.push(val);
    if (j >= n) break; if (line[j] !== delim) return null; i = j + 1; if (i === n) { fields.push(''); values.push(''); break; } }
  return { fields, values };
}
const text = fs.readFileSync('bench/z48/corpus/airport-codes-300.csv', 'utf8');
const base = parents(text, 'airport-base');
const reduced = text.split(/(\r?\n)/).map(p => { if (p === '\n' || p === '\r\n' || p === '') return p; const r = splitCsvLine(p, ','); return r ? r.fields.filter((_, i) => i !== 5).join(',') : p; }).join('');
const restored = reduced.split(/(\r?\n)/).map((p, li) => { if (p === '\n' || p === '\r\n' || p === '') return p; const r = splitCsvLine(p, ','); if (!r) return p; const v = li === 0 ? 'iso_country' : r.values[5]!.split('-')[0]!; const f = [...r.fields]; f.splice(5, 0, v); return f.join(','); }).join('');
console.log('airport roundTrip', restored === text);
const cand = parents(reduced, 'airport-reduced');
const contract = 'After decoding, reinsert computed columns: column iso_country (6th) = iso_region before its first "-".';
console.log(JSON.stringify({ lane: 'airport iso_country', rawTok: T(text), baseMin: base.min, baseWho: base.who, candMin: cand.min, candWho: cand.who, contractTok: T(contract), candTotal: cand.min + T(contract) + 1, delta: cand.min + T(contract) + 1 - base.min }));

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
  if (!tr) { console.log(JSON.stringify({ lane: p, parse: false })); continue; }
  console.log(p, 'roundTrip', odRestore(tr.out) === tx, 'lines', tr.lines, 'rawTok', T(tx), 'reducedRawTok', T(tr.out));
  const b = parents(tx, p + '-base'); const c = parents(tr.out, p + '-reduced');
  console.log(JSON.stringify({ lane: p.split('/').pop(), baseMin: b.min, baseWho: b.who, candMin: c.min, candWho: c.who, contractTok: T(OD_CONTRACT), candTotal: c.min + T(OD_CONTRACT) + 1, delta: c.min + T(OD_CONTRACT) + 1 - b.min }));
}
console.log('DONE');
