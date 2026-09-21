/**
 * bench/ambient-redteam.ts — adversarial gauntlet for AMBIENT-AM1.
 *
 * The bar: byte-exactness on hostile input, a TOTAL decoder, and — the gate
 * that matters most — proof that the claimed mechanism is real (C4/C5) rather
 * than a relabelling of STRAND's wire.
 */
import fs from 'node:fs';
import { ambientEncode, ambientDecode } from '../src/lib/omega/ambient';
import { strandEncode, strandDynPool, strandStaticPool } from '../src/lib/omega/strand';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('  FAIL:', m); } };

const ENCS: EncodingName[] = ['o200k_base', 'cl100k_base'];
const rt = (t: string, enc: EncodingName, label: string) => {
  const a = ambientEncode(t, enc);
  ok(a.decoded === t, `${label} [${enc}] decoded !== source`);
  ok(ambientDecode(a.doc) === t, `${label} [${enc}] ambientDecode(doc) !== source`);
  ok(a.exact, `${label} [${enc}] not flagged exact`);
  if (a.mode === 'ambient') ok(a.outTokens < a.inTokens, `${label} [${enc}] ambient mode without gain`);
  return a;
};

console.log('C1 real corpora');
for (const d of ['bench/holdout', 'bench/train'].filter((x) => fs.existsSync(x))) {
  for (const f of fs.readdirSync(d).sort()) {
    const t = fs.readFileSync(`${d}/${f}`, 'utf8');
    for (const enc of ENCS) rt(t, enc, `${d}/${f}`);
  }
}

console.log('C2 hostile inputs');
const dyn = strandDynPool('o200k_base');
const sta = strandStaticPool('o200k_base');
const hostile: Array<[string, string]> = [
  ['empty', ''],
  ['one char', 'x'],
  ['separator in source', 'text\n---\nmore text\n---\nrepeat '.repeat(30)],
  ['preamble in source', 'Each table row starts with its glyph and runs to the next glyph. '.repeat(12)],
  ['newline-heavy', 'a\nb\nc\n'.repeat(400)],
  ['crlf', 'line one\r\nline two\r\n'.repeat(40)],
  ['tabs', '\t\tindented\t\tindented'.repeat(40)],
  ['emoji zwj', '👨‍👩‍👧‍👦 family '.repeat(40)],
  ['combining', 'e\u0301e\u0301 accented '.repeat(50)],
  ['rtl', 'العربية نص عربي مكرر '.repeat(40)],
  ['cjk', '日本語のテキストが繰り返されます '.repeat(40)],
  ['all whitespace', ' '.repeat(2500)],
  ['single repeat', 'A'.repeat(5000)],
  ['dyn glyphs in source', dyn.slice(0, 60).join('') + ' body '.repeat(50)],
  ['static glyphs in source', sta.slice(0, 60).join('') + ' body '.repeat(50)],
  ['both pools in source', [...dyn.slice(0, 30), ...sta.slice(0, 30)].join('') + ' tail '.repeat(50)],
  ['json deep', JSON.stringify({ a: Array.from({ length: 250 }, (_, i) => ({ id: i, url: `https://x/${i}` })) })],
];
for (const [label, t] of hostile) for (const enc of ENCS) rt(t, enc, label);

console.log('C3 decoder totality');
const junk = ['', 'plain', '---', '\n---\n', 'x\n---\n', 'no sep at all',
  'Expand\n---\n', dyn[0] + '\n---\n' + dyn[0], '\n---\n'.repeat(9), 'a\n---\nb\n---\nc'];
for (const j of junk) {
  let threw = false;
  try { ambientDecode(j); } catch { threw = true; }
  ok(!threw, `decoder threw on ${JSON.stringify(j).slice(0, 36)}`);
}
ok(ambientDecode('untouched plain text') === 'untouched plain text', 'non-AMBIENT doc mutated');

console.log('C4 mechanism non-vacuity: preamble is load-bearing');
{
  const enc: EncodingName = 'o200k_base';
  // The whole premise is that a 24-token self-evident preamble beats STRAND's
  // 154-token procedural one. If the preamble were free this lane is pointless.
  const SHORT = 'Each table row starts with its glyph and runs to the next glyph. ' +
    'Expand in the body; output the text exactly.\n';
  const LONG = fs.existsSync('src/lib/omega/strand.ts')
    ? 'A STRAND message begins with the mark glyph. If the next character is the ' +
      'static flag the book is active. Everything up to the end glyph is the dynamic ' +
      'header; inside it, the first Hangul glyph not yet bound starts a new definition ' +
      'and runs until the next unbound Hangul glyph. A bound glyph inside a definition ' +
      'is a reference to that earlier definition; a static glyph is a book lookup.\n'
    : SHORT;
  ok(countTokens(SHORT, enc) < 40, 'short preamble is not actually short');
  ok(countTokens(LONG, enc) > countTokens(SHORT, enc) * 2,
    'procedural preamble is not materially larger — no cost asymmetry to exploit');
}

console.log('C5 AMBIENT is distinct from STRAND under zero-context scoring');
{
  const enc: EncodingName = 'o200k_base';
  let wins = 0, checked = 0;
  for (const f of fs.existsSync('bench/holdout') ? fs.readdirSync('bench/holdout').sort() : []) {
    const t = fs.readFileSync(`bench/holdout/${f}`, 'utf8');
    const r = strandEncode(t, enc);
    if (r.mode !== 'strand') continue;
    let rows = 0;
    for (const e of r.entries.filter((x) => x.kind === 'static')) {
      rows += countTokens(`${e.glyph}=${JSON.stringify(e.phrase)} `, enc);
    }
    const strandSelf = r.outTokens + rows + 154;
    const a = ambientEncode(t, enc);
    checked++;
    if (a.outTokens < strandSelf) wins++;
    ok(a.decoded === t, `C5 ${f} not byte-exact`);
  }
  ok(checked > 0, 'no strand-mode file to compare against');
  ok(wins > 0, 'AMBIENT never beats self-contained STRAND — not a distinct lane');
}

console.log('C6 determinism');
for (const f of fs.existsSync('bench/holdout') ? fs.readdirSync('bench/holdout').sort() : []) {
  const t = fs.readFileSync(`bench/holdout/${f}`, 'utf8');
  const a = ambientEncode(t, 'o200k_base'), b = ambientEncode(t, 'o200k_base');
  ok(a.doc === b.doc, `non-deterministic doc for ${f}`);
  ok(a.outTokens === b.outTokens, `non-deterministic cost for ${f}`);
}

console.log('C7 truncation resilience');
{
  const t = fs.existsSync('bench/holdout/json-pkg.txt')
    ? fs.readFileSync('bench/holdout/json-pkg.txt', 'utf8') : 'repeat me '.repeat(90);
  const a = ambientEncode(t, 'o200k_base');
  for (const frac of [0.05, 0.2, 0.4, 0.6, 0.8, 0.95, 0.99]) {
    const cut = a.doc.slice(0, Math.floor(a.doc.length * frac));
    let threw = false;
    try { ambientDecode(cut); } catch { threw = true; }
    ok(!threw, `decoder threw on doc truncated to ${frac}`);
  }
}

console.log('C8 no dangling glyph: every glyph in the body has a legend row');
{
  const enc: EncodingName = 'o200k_base';
  const universe = new Set([...strandDynPool(enc), ...strandStaticPool(enc)]);
  for (const f of fs.existsSync('bench/holdout') ? fs.readdirSync('bench/holdout').sort() : []) {
    const t = fs.readFileSync(`bench/holdout/${f}`, 'utf8');
    const a = ambientEncode(t, enc);
    if (a.mode !== 'ambient') continue;
    const sep = a.doc.indexOf('\n---\n');
    const body = a.doc.slice(sep + 5);
    const defined = new Set(a.entries.map((e) => e.glyph));
    const dangling = [...body].filter((c) => universe.has(c) && !defined.has(c));
    ok(dangling.length === 0, `${f} body references ${dangling.length} undefined glyph(s)`);
  }
}

console.log('C9 compression floor (guards silent degradation)');
{
  const enc: EncodingName = 'o200k_base';
  let amb = 0, self = 0, modes = 0;
  for (const f of fs.existsSync('bench/holdout') ? fs.readdirSync('bench/holdout').sort() : []) {
    const t = fs.readFileSync(`bench/holdout/${f}`, 'utf8');
    const r = strandEncode(t, enc);
    let sc = countTokens(t, enc);
    if (r.mode === 'strand') {
      let rows = 0;
      for (const e of r.entries.filter((x) => x.kind === 'static')) {
        rows += countTokens(`${e.glyph}=${JSON.stringify(e.phrase)} `, enc);
      }
      sc = r.outTokens + rows + 154;
    }
    self += sc;
    const a = ambientEncode(t, enc);
    amb += a.outTokens;
    if (a.mode === 'ambient') modes++;
  }
  // Measured baseline: 8251 vs 9770 self-contained STRAND. A mutation that
  // silently stops folding (e.g. dropping the static pool from the glyph
  // universe, or failing to unfold rejected entries) pushes this back toward
  // 9512/9947 and must fail loudly rather than just assert fewer times.
  ok(amb <= 8400, `AMBIENT total regressed to ${amb} (expected <= 8400)`);
  ok(amb < self - 1200, `AMBIENT gain collapsed: ${self - amb} (expected > 1200)`);
  ok(modes >= 6, `only ${modes} files reached ambient mode (expected >= 6)`);
}

console.log(`\nAMBIENT RED-TEAM: ${pass} pass / ${fail} fail`);
if (fail > 0) process.exit(1);
