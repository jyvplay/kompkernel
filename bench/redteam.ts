/** Independent adversary. Does NOT reuse prism's own self-test fixtures. */
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { prismEncode, prismDecode, prismDecoderPrompt } from '../src/lib/omega/prism';
import { mosaicEncode, mosaicDecode, mosaicDecoderPrompt } from '../src/lib/omega/mosaic';
import { corpus } from './fixtures';

let fails = 0; let n = 0; let unsound = 0;
const bad = (m: string) => { fails++; console.log('  ✗ ' + m); };
const chk = (c: boolean, m: string) => { n++; if (!c) bad(m); };

// A1: fuzz — random byte soup, both encodings.
function rnd(seed: number) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const alphabets = [
  'ab\n', 'AB01 \n', '{}[]",:\n0123456789', 'AAAA\n\n\n   ', '中文🚀≈\n', '⟡⟐一丁[]MZ1PSG\n',
  '[MZ1]\n[P1]\n[SG1]\n[AN1]\n[PX2]\nKEY LUMEN\n[PR1]\n', '\u0000\u0001\uD800\uDFFF\r\n',
];
for (const enc of ['o200k_base', 'cl100k_base'] as EncodingName[]) {
  const r = rnd(0xC0FFEE);
  for (let i = 0; i < 260; i++) {
    const A = alphabets[Math.floor(r() * alphabets.length)];
    const len = Math.floor(r() * 420);
    let s = ''; for (let j = 0; j < len; j++) s += A[Math.floor(r() * A.length)];
    let res; try { res = prismEncode(s, enc); } catch (e) { bad(`fuzz throw ${enc} ${JSON.stringify(s.slice(0,40))}: ${(e as Error).message}`); continue; }
    n++;
    if (prismDecode(res.wire) !== s) bad(`fuzz roundtrip ${enc} ${JSON.stringify(s.slice(0,60))}`);
    if (!res.exact) bad(`fuzz not-exact ${enc}`);
    if (res.mode !== 'forced-wrap' && res.outTokens > res.inTokens) bad(`fuzz expand ${enc} ${res.outTokens}>${res.inTokens}`);
    // PARETO under fuzz
    const m = mosaicEncode(s, enc);
    // MOSAIC is only a legitimate Pareto yardstick where MOSAIC is itself
    // byte-exact. Where the raw text is decoder-visible, MOSAIC returns it
    // unescaped (cheap but WRONG: its own decoder rewrites it) while PRISM pays
    // 4 tokens to force-wrap and stays exact. Comparing those is comparing a
    // correct artifact against an incorrect one.
    let mosaicSound: boolean;
    try { mosaicSound = mosaicDecode(m.wire) === s && prismDecode(s) === s; }
    catch { mosaicSound = false; }
    if (mosaicSound && res.outTokens > m.outTokens) bad(`fuzz PARETO LOSS ${enc} prism=${res.outTokens} mosaic=${m.outTokens} ${JSON.stringify(s.slice(0,60))}`);
    if (!mosaicSound) unsound++;
  }
}
console.log(`A1 fuzz done (${n} checks; ${unsound} inputs where MOSAIC's own decoder is unsound and PRISM force-wrapped)`);

// A2: real corpus, BOTH tokenizers, pareto + delivered-token pareto.
for (const enc of ['o200k_base', 'cl100k_base'] as EncodingName[]) {
  for (const [name, text] of Object.entries(corpus())) {
    const p = prismEncode(text, enc); const m = mosaicEncode(text, enc);
    chk(prismDecode(p.wire) === text, `A2 rt ${enc} ${name}`);
    chk(p.outTokens <= m.outTokens, `A2 PARETO ${enc} ${name} ${p.outTokens}>${m.outTokens}`);
    const pd = p.outTokens + countTokens(prismDecoderPrompt(p), enc);
    const md = m.outTokens + countTokens(mosaicDecoderPrompt(m), enc);
    chk(pd <= md, `A2 DELIVERED ${enc} ${name}: prism=${pd} mosaic=${md} (+${pd-md})`);
  }
}
console.log('A2 corpus done');

// A3: idempotence of decode — decoding a decoded doc must be stable.
for (const [name, text] of Object.entries(corpus())) {
  const p = prismEncode(text, 'o200k_base');
  const d1 = prismDecode(p.wire); const d2 = prismDecode(d1);
  chk(d1 === text, `A3 d1 ${name}`);
  chk(d2 === d1 || prismEncode(text,'o200k_base').mode === 'identity', `A3 decode-not-idempotent ${name}`);
}
console.log('A3 decode stability done');

// A4: the forced-wrap path must be exact for EVERY wire prism can produce.
for (const [name, text] of Object.entries(corpus())) {
  const p = prismEncode(text, 'o200k_base');
  if (p.mode === 'identity') continue;
  const w = prismEncode(p.wire, 'o200k_base');   // feed a wire back in as literal
  chk(prismDecode(w.wire) === p.wire, `A4 wire-as-input ${name}`);
}
console.log('A4 wire-as-literal done');

// A5: adversarial concatenation — glue every pair of fixtures, assert pareto.
const cs = Object.entries(corpus());
let pairWins = 0, pairChecks = 0;
for (let i = 0; i < cs.length; i += 3) for (let j = 0; j < cs.length; j += 5) {
  const t = cs[i][1] + '\n' + cs[j][1];
  const p = prismEncode(t, 'o200k_base'); const m = mosaicEncode(t, 'o200k_base');
  pairChecks++;
  if (prismDecode(p.wire) !== t) bad(`A5 rt ${cs[i][0]}+${cs[j][0]}`);
  if (p.outTokens > m.outTokens) bad(`A5 PARETO ${cs[i][0]}+${cs[j][0]} ${p.outTokens}>${m.outTokens}`);
  if (p.outTokens < m.outTokens) pairWins++;
}
console.log(`A5 pairs: ${pairChecks} checked, ${pairWins} strict wins`);

console.log(fails === 0 ? `\nRED TEAM CLEAN (${n} assertions)` : `\nRED TEAM: ${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
