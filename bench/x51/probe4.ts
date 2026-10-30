// X51 probe phase 4: FD column deletion + od dual-rendering vs DAEDALUS/AKOLOUTHIA-2/APOGRAPHE baselines.
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
const ENC = 'o200k_base' as const;
const T = (s: string) => countTokens(s, ENC);
function parents(text: string): { min: number; who: string; all: Record<string, number> } {
  const all: Record<string, number> = {};
  const d = daedalusEncode(text, ENC); if (!d.exact || d.decoded !== text) throw new Error('dae inexact'); all.daedalus = d.messageTokens;
  const a = akolouthia2Encode(text, ENC); if (!a.exact || a.decoded !== text) throw new Error('ako inexact'); all.ako2 = countTokens(a.decoderPrompt, ENC);
  const g: any = apographeEncode(text, ENC); if (apographeDecodeResult(g) !== text) throw new Error('apo inexact');
  all.apographe = T((g.contract ? g.contract + '\n' : '') + g.wire);
  const who = Object.entries(all).sort((x, y) => x[1] - y[1])[0]!;
  return { min: who[1], who: who[0], all };
}
// CSV split/drop (same as probe3)
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
function dropCols(text: string, delim: string, idxs: Set<number>): string {
  return text.split(/(\r?\n)/).map(p => { if (p === '\n' || p === '\r\n' || p === '') return p; const r = splitCsvLine(p, delim); return r ? r.fields.filter((_, i) => !idxs.has(i)).join(delim) : p; }).join('');
}
function restoreCols(text: string, delim: string, spec: { idx: number; name: string; compute: (vals: string[]) => string }[]): string {
  // spec applied in listed order; vals are current row values including previously restored
  const lines = text.split(/(\r?\n)/);
  let headerDone = false;
  return lines.map(p => {
    if (p === '\n' || p === '\r\n' || p === '') return p;
    const r = splitCsvLine(p, delim); if (!r) return p;
    const vals = [...r.values]; const raws = [...r.fields];
    for (const s of spec) { const v = headerDone ? s.compute(vals) : s.name; vals.splice(s.idx, 0, v); raws.splice(s.idx, 0, v.includes(delim) || v.includes('"') ? '"' + v.replace(/"/g, '""') + '"' : v); }
    headerDone = true;
    return raws.join(delim);
  }).join('');
}


function mulDecStr(x: string, y: string): string {
  const p = (s2: string) => { const m = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(s2)!; return { neg: m[1] === '-', mag: BigInt(m[2] + (m[3] ?? '')), scale: (m[3] ?? '').length }; };
  const a = p(x), b = p(y); const mag = a.mag * b.mag; const scale = a.scale + b.scale;
  let d = mag.toString().padStart(scale + 1, '0'); if (scale) d = d.slice(0, -scale) + '.' + d.slice(-scale);
  if (d.includes('.')) d = d.replace(/0+$/, '').replace(/\.$/, '');
  return (a.neg !== b.neg && mag !== 0n ? '-' : '') + d;
}
const cases: { lane: string; path: string; delim: string; drops: { idx: number; name: string; desc: string; compute: (v: string[]) => string }[] }[] = [
  { lane: 'csv-3 product', path: 'bench/z11/fresh/csv-3.csv', delim: ',', drops: [
    { idx: 8, name: '"COUTAX_FEMALEUNEMP"', desc: 'column COUTAX_FEMALEUNEMP (last, quoted header) = COUTAX * UNEMPF as integers', compute: v => mulDecStr(v[2]!, v[3]!) } ] },
  { lane: 'csv-5 concat ID', path: 'bench/z11/fresh/csv-5.csv', delim: ',', drops: [
    { idx: 5, name: 'ID', desc: 'column ID (6th) = "age" + age + "_" + gender', compute: v => `age${v[3]}_${v[2]}` } ] },
  { lane: 'airport iso_country', path: 'bench/z48/corpus/airport-codes-300.csv', delim: ',', drops: [
    { idx: 5, name: 'iso_country', desc: 'column iso_country (6th) = iso_region before its first "-"', compute: v => v[6]!.split('-')[0]! } ] },
];
for (const cs of cases) {
  const text = fs.readFileSync(cs.path, 'utf8'); const t0 = Date.now();
  const base = parents(text);
  const reduced = dropCols(text, cs.delim, new Set(cs.drops.map(d => d.idx)));
  const restored = restoreCols(reduced, cs.delim, cs.drops.map(d => ({ idx: d.idx, name: d.name, compute: d.compute })));
  const rt = restored === text;
  const contract = 'After decoding, reinsert computed columns: ' + cs.drops.map(d => d.desc).join('; ') + '.';
  const cand = parents(reduced);
  const total = cand.min + T(contract) + 1;
  console.log(JSON.stringify({ lane: cs.lane, rawTok: T(text), roundTrip: rt, base, candParents: cand, contractTok: T(contract), candTotal: total, deltaVsBaseMin: total - base.min, ms: Date.now() - t0 }));
}

// od dual rendering (fixed parser; keep only byte pairs + final offset line)
const OD_LINE = /^([0-9a-f]{6,})((?: [0-9a-f]{2})+) +>(.*)<$/;
function odTransform(text: string): { out: string; lines: number } | null {
  const lines = text.split('\n'); const out: string[] = []; let n = 0;
  for (const l of lines) { const m = OD_LINE.exec(l);
    if (m) { out.push(m[2]!.trim()); n++; }
    else if (l === '' || /^[0-9a-f]{6,}$/.test(l) || l.startsWith('#')) out.push(l);
    else return null; }
  return { out: out.join('\n'), lines: n };
}
function odRestore(text: string): string {
  const lines = text.split('\n'); const fin = [...lines].reverse().find(l => /^[0-9a-f]{6,}$/.test(l));
  const width = fin ? fin.length : 6;
  const out: string[] = []; let idx = 0;
  for (const l of lines) {
    if (/^(?:[0-9a-f]{2} )*[0-9a-f]{2}$/.test(l)) {
      const bytes = l.split(' ').map(h => parseInt(h, 16));
      const hexPart = bytes.map(b => ' ' + b.toString(16).padStart(2, '0')).join('');
      const gutter = bytes.map(b => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.')).join('');
      out.push(`${(idx * 16).toString(16).padStart(width, '0')}${hexPart}${' '.repeat(3 * (16 - bytes.length))}  >${gutter}<`); idx++;
    } else out.push(l);
  }
  return out.join('\n');
}
const OD_CONTRACT = 'Each line lists 16 bytes in hex (the last may be fewer). Rewrite every such line as an od line: the byte offset in hex (line number counting from 0, times 16), padded with zeros to the width of the final offset line, then the bytes in hex each preceded by a space, then spaces so the gutter aligns as if 16 bytes were present, then two spaces, then > then one character per byte (the ASCII character itself when printable, else a dot) then <. Keep other lines unchanged.';
console.log('od contract tok', T(OD_CONTRACT));
for (const p of ['bench/x51/fixtures/od-ls.txt', 'bench/x51/fixtures/od-text.txt']) {
  const text = fs.readFileSync(p, 'utf8'); const tr = odTransform(text);
  if (!tr) { console.log(JSON.stringify({ lane: p, parse: false })); continue; }
  const rt = odRestore(tr.out) === text; const t0 = Date.now();
  const base = parents(text); const cand = parents(tr.out);
  const total = cand.min + T(OD_CONTRACT) + 1;
  console.log(JSON.stringify({ lane: p.split('/').pop(), rawTok: T(text), lines: tr.lines, roundTrip: rt, base, candParents: cand, candTotal: total, deltaVsBaseMin: total - base.min, ms: Date.now() - t0 }));
}
console.log('DONE');
