// X19: anatomy of the saved LAKONIKOS-D wires (bench/x16/lakonikos-d/*.wire.txt).
// Cheap: tokenizer only. Reports token classes and the most frequent literal tokens.
import fs from 'node:fs';
import { encode } from 'gpt-tokenizer';

const dir = 'bench/x16/lakonikos-d';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.wire.txt')).sort();
const enc = (s) => encode(s);

let total = 0;
const cls = { glyph: 0, digit: 0, letter: 0, space: 0, punct: 0, word: 0, other: 0 };
const freq = new Map();
const freqByClass = { glyph: new Map(), digit: new Map(), letter: new Map(), punct: new Map(), word: new Map(), space: new Map(), other: new Map() };

// per-id decode cache
var cache = new Map();
function dec(id) {
  if (cache.has(id)) return cache.get(id);
  const s = decodeOne(id);
  cache.set(id, s);
  return s;
}
var _vocab = null;
function decodeOne(id) {
  if (!_vocab) {
    const lines = fs.readFileSync('node_modules/gpt-tokenizer/data/o200k_base.tiktoken', 'utf8').trim().split('\n');
    _vocab = [];
    for (const l of lines) { const p = l.split(' '); if (p.length < 2) continue; _vocab.push(Buffer.from(p[0], 'base64').toString('utf8')); }
  }
  return _vocab[id] ?? '';
}


function classify(tok) {
  if (/^[\p{P}\p{S}\p{C}]+$/u.test(tok) && !/^[\p{L}\p{N}]+$/u.test(tok)) {
    // a punctuation/symbol token; glyphs are letters of a script though
  }
  if (/^[\p{L}]+$/u.test(tok) && [...tok].length === 1 && tok.codePointAt(0) > 127) return 'glyph';
  if (/^[0-9]+$/.test(tok)) return 'digit';
  if (/^\s+$/.test(tok)) return 'space';
  if (/^[^\p{L}\p{N}\s]+$/u.test(tok)) return 'punct';
  if (/^[\p{L}']+$/u.test(tok)) return 'letter';
  if (/^\s*[\p{L}\p{N}]/u.test(tok) && /[\p{L}\p{N}]\s*$/u.test(tok)) return 'word';
  return 'other';
}

const perLane = [];
for (const f of files) {
  const text = fs.readFileSync(`${dir}/${f}`, 'utf8');
  const ids = enc(text);
  total += ids.length;
  const lane = { file: f, n: ids.length, c: {} };
  for (const id of ids) {
    const s = dec(id);
    const k = classify(s);
    cls[k] = (cls[k] ?? 0) + 1;
    lane.c[k] = (lane.c[k] ?? 0) + 1;
    freq.set(s, (freq.get(s) ?? 0) + 1);
    (freqByClass[k] ??= new Map()).set(s, ((freqByClass[k] ?? new Map()).get(s) ?? 0) + 1);
  }
  perLane.push(lane);
}

console.log('lanes', files.length, 'total wire tokens', total);
console.log('classes:', Object.entries(cls).map(([k, v]) => `${k}=${v} (${(100 * v / total).toFixed(1)}%)`).join(' '));
console.log();
for (const k of ['glyph', 'digit', 'letter', 'punct', 'word', 'space', 'other']) {
  const m = freqByClass[k];
  if (!m) continue;
  const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  const tot = [...m.values()].reduce((a, b) => a + b, 0);
  console.log(`--- ${k}: ${tot} tokens (${(100 * tot / total).toFixed(1)}%), ${m.size} distinct`);
  console.log('    ' + top.map(([s, n]) => `${JSON.stringify(s)}×${n}`).join(' '));
}
