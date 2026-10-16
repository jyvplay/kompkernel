// X18a: classify o200k tokens of each saved LAKONIKOS-D wire (bench/x16/lakonikos-d/*.wire.txt) by class.
// Classes by decoded token text: digit (only 0-9), space (only whitespace), letter (only A-Za-z),
// glyph (contains a non-ASCII char), other (punctuation/mixed). Counts tokens and digits.
const fs = require('fs');
const path = require('path');
const { encode, decode } = require('gpt-tokenizer/encoding/o200k_base');
const D = path.join(__dirname, '..', '..', '..', 'bench/x16/lakonikos-d');
const wires = fs.readdirSync(D).filter(f => f.endsWith('.wire.txt')).sort();
const agg = { digit: 0, space: 0, letter: 0, glyph: 0, other: 0, total: 0, digitChars: 0 };
const rows = [];
for (const f of wires) {
  const lane = f.replace('.wire.txt', '');
  const ids = encode(fs.readFileSync(path.join(D, f), 'utf8'));
  const c = { digit: 0, space: 0, letter: 0, glyph: 0, other: 0, digitChars: 0 };
  for (const id of ids) {
    const s = decode([id]);
    let cls;
    if (/^[0-9]+$/.test(s)) { cls = 'digit'; c.digitChars += s.length; }
    else if (/^\s+$/.test(s)) cls = 'space';
    else if (/^[A-Za-z]+$/.test(s)) cls = 'letter';
    else if (/[^\x00-\x7f]/.test(s)) cls = 'glyph';
    else cls = 'other';
    c[cls]++;
  }
  c.total = ids.length;
  for (const k of Object.keys(agg)) agg[k] += c[k];
  rows.push({ lane, ...c });
}
const pct = (x) => (100 * x / agg.total).toFixed(1);
console.log(JSON.stringify({ aggregate: agg, pct: { digit: pct(agg.digit), space: pct(agg.space), letter: pct(agg.letter), glyph: pct(agg.glyph), other: pct(agg.other) }, digitCharsPerDigitToken: (agg.digitChars / agg.digit).toFixed(2) }));
for (const r of rows) console.log(r.lane.padEnd(34), 'tot', String(r.total).padStart(5), 'dig', String(r.digit).padStart(4), 'spc', String(r.space).padStart(4), 'let', String(r.letter).padStart(4), 'gly', String(r.glyph).padStart(4), 'oth', String(r.other).padStart(4));
