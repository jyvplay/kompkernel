// X19 prototype: relabel the glyph alphabet of a finished CHIRON wire to cut tokens.
// Pure character substitution sigma on the whole wire; the decoder is untouched,
// so the saving costs ZERO contract tokens.
import fs from 'node:fs';
import { encode, decode } from 'gpt-tokenizer';

const lines = fs.readFileSync('node_modules/gpt-tokenizer/data/o200k_base.tiktoken', 'utf8').trim().split('\n');
const VOCAB = [];
for (const l of lines) { const p = l.split(' '); if (p.length < 2) continue; VOCAB.push(Buffer.from(p[0], 'base64').toString('utf8')); }
const CL = fs.readFileSync('node_modules/gpt-tokenizer/data/cl100k_base.tiktoken', 'utf8').trim().split('\n');
const VOCAB2 = new Set();
for (const l of CL) { const p = l.split(' '); if (p.length < 2) continue; VOCAB2.add(Buffer.from(p[0], 'base64').toString('utf8')); }

const T = s => encode(s).length;
// script ranges copied from src/lib/omega/chiron.ts CHIRON_SCRIPTS
const SCRIPTS = [
  { name: 'hangul', lo: 0xac00, hi: 0xd7a4 },
  { name: 'katakana', lo: 0x30a0, hi: 0x3100 },
  { name: 'cyrillic', lo: 0x0400, hi: 0x0500 },
  { name: 'arabic', lo: 0x0600, hi: 0x0700 },
  { name: 'myanmar', lo: 0x1000, hi: 0x1100 },
  { name: 'khmer', lo: 0x1780, hi: 0x1800 },
  { name: 'cjk', lo: 0x4e00, hi: 0xa000 },
];
const inScript = (s, cp) => (s.ranges ? s.ranges.some(([a, b]) => cp >= a && cp < b) : cp >= s.lo && cp < s.hi);
function scriptOf(ch) { const cp = ch.codePointAt(0); for (const s of SCRIPTS) if (inScript(s, cp)) return s; return null; }
function parseTape(tape, script) {
  const inS = ch => inScript(script, ch.codePointAt(0));
  const used = new Set(); const out = []; let i = 0;
  if (!inS(tape[0])) return null;
  while (i < tape.length) {
    const glyph = tape[i];
    if (!inS(glyph) || used.has(glyph)) return null;
    used.add(glyph);
    let j = i + 1;
    while (j < tape.length && !(inS(tape[j]) && !used.has(tape[j]))) j++;
    out.push(glyph);
    i = j;
  }
  return out;
}

function analyse(wire, budgetMs, verbose) {
  if (!wire.startsWith('§')) return null;
  const cut = wire.indexOf('¶', 1);
  if (cut < 0) return null;
  const tape = wire.slice(1, cut), body = wire.slice(cut + 1);
  const script = scriptOf(tape[0]);
  if (!script) return null;
  const glyphs = parseTape(tape, script);
  if (!glyphs || glyphs.length < 2) return null;
  const G = new Set(glyphs);
  // literal characters of the wire (everything that is not a glyph)
  const literal = new Set();
  for (const ch of wire) if (!G.has(ch)) literal.add(ch);
  // candidate pool: 1 token under both, in script, not literal, not a frame char
  const frames = new Set(['§', '¶', '×', '…', '@']);
  const pool = [];
  for (let cp = script.lo; cp < script.hi; cp++) {
    const ch = String.fromCodePoint(cp);
    if (literal.has(ch) || frames.has(ch)) continue;
    if (T(ch) !== 1) continue;
    pool.push(ch);
    if (pool.length > 4000) break;
  }
  if (pool.length < glyphs.length) return null;
  // occurrences
  const occ = new Map(glyphs.map(g => [g, []]));
  const arr = [...wire];
  for (let i = 0; i < arr.length; i++) if (occ.has(arr[i])) occ.get(arr[i]).push(i);
  const weight = new Map(glyphs.map(g => [g, occ.get(g).length]));
  const order = [...glyphs].sort((a, b) => weight.get(b) - weight.get(a));

  // greedy: assign one glyph at a time, in decreasing occurrence weight,
  // scoring by full token count of the partially-substituted wire.
  const t0 = Date.now();
  const sigma = new Map();
  const used = new Set();
  // start from identity
  for (const g of glyphs) { sigma.set(g, g); used.add(g); }
  let cur = wire;
  let curTok = T(wire);
  const baseTok = curTok;
  const applySigma = (w, s) => { const a = [...w]; for (let i = 0; i < a.length; i++) { const v = s.get(a[i]); if (v !== undefined) a[i] = v; } return a.join(''); };
  let evals = 0;
  for (let round = 0; round < 2; round++) {
    for (const g of order) {
      if (Date.now() - t0 > budgetMs) break;
      let bestC = sigma.get(g), bestTok = curTok;
      // temporarily unassign g
      const prev = sigma.get(g);
      for (const c of pool) {
        if (used.has(c) && c !== prev) continue;
        if (c === prev) continue;
        sigma.set(g, c);
        const w = applySigma(wire, sigma);
        const t = T(w); evals++;
        if (t < bestTok) { bestTok = t; bestC = c; }
        if (Date.now() - t0 > budgetMs) break;
      }
      if (bestC !== prev) { used.delete(prev); used.add(bestC); sigma.set(g, bestC); curTok = bestTok; }
      else sigma.set(g, prev);
    }
  }
  const outWire = applySigma(wire, sigma);
  const outTok = T(outWire);
  return { baseTok, outTok, gain: baseTok - outTok, glyphs: glyphs.length, evals, ms: Date.now() - t0, outWire, sigma, script: script.name };
}

const dir = 'bench/x16/lakonikos-d';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.wire.txt')).sort();
const only = process.argv.slice(2);
let tg = 0, tb = 0;
for (const f of files) {
  if (only.length && !only.some(o => f.includes(o))) continue;
  const wire = fs.readFileSync(`${dir}/${f}`, 'utf8');
  const r = analyse(wire, 60000);
  if (!r) { console.log(`${f.padEnd(46)} n/a`); continue; }
  tg += r.gain; tb += r.baseTok;
  console.log(`${f.padEnd(46)} wire=${String(r.baseTok).padStart(5)} -> ${String(r.outTok).padStart(5)} gain=${String(r.gain).padStart(4)} glyphs=${String(r.glyphs).padStart(4)} evals=${String(r.evals).padStart(6)} ${r.ms}ms script=${r.script}`);
  if (only.length) fs.writeFileSync('/tmp/relabelled.txt', r.outWire);
}
console.log(`TOTAL base ${tb} gain ${tg} (${(100 * tg / tb).toFixed(2)}%)`);
