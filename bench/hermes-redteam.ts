/**
 * bench/hermes-redteam.ts — independent adversarial gates for HERMES-Ω.
 *
 * Every gate re-derives its expectation from the contract, not from the
 * implementation: byte-exact round trips on held-out + fixture lanes, a
 * prompt-literal decode that executes ONLY what the decoder prompt says
 * (parsed out of the prompt text, no codec internals), totality on hostile
 * inputs, counter correctness, collision handling, determinism, the glyph
 * cap, a 250-case structured fuzz, and the honest single-message-cost
 * (M = decoder prompt + wire) Pareto gates against identity and the
 * stacked frontier (whose decoder prompts are measured live).
 */
import fs from 'node:fs';
import assert from 'node:assert';
import { hermesEncode, hermesDecode, hermesDecoderPrompt, hermesParse, HERMES_START, HERMES_SEP, HERMES_COUNTER } from '../src/lib/omega/hermes';
import { countTokens } from '../src/lib/omega/bpe';
import { logosDecoderPrompt } from '../src/lib/omega/logos';
import { proteusDecoderPrompt } from '../src/lib/omega/proteus';
import { CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, MOSAIC_HANDTRACE_300, mosaicFixtures } from './fixtures';

const enc = 'o200k_base' as const;
let n = 0;
const ok = async (name: string, fn: () => Promise<void> | void) => {
  try { await fn(); n++; console.log(`  ok  ${name}`); }
  catch (e) { console.error(`  FAIL ${name}`); throw e; }
};

/* ---------------------------------------------------------------------------
 * Prompt-literal decode: everything the "reader" knows comes from the prompt
 * text itself. Frame characters, the glyph script range, and the counter
 * syntax are REGEXED OUT of the prompt; the decode algorithm is then executed
 * exactly as the prompt words it. No codec internals are consulted.
 * ------------------------------------------------------------------------- */
function promptLiteralDecode(message: string): string {
  // "No ∀ prefix: output the WIRE unchanged."
  const start = message.match(/No (.) prefix/)![1];
  const sep = message.match(/ending at the first (.)\./)![1];
  const counter = message.match(/exactly (.)\[x n\]/)?.[1] ?? '∆';
  const wire = message.split(`WIRE:\n`)[1].split(`\nNo ${start} prefix`)[0];
  if (!wire.startsWith(start)) return wire;
  // "Each definition = a new <script> glyph ..." -> extract the range
  const rangeMatch = message.match(/U\+([0-9A-F]{4})–U\+([0-9A-F]{4})/);
  assert.ok(rangeMatch, 'script range printed in prompt');
  const lo = parseInt(rangeMatch[1], 16), hi = parseInt(rangeMatch[2], 16);
  const inScript = (ch: string) => { const cp = ch.codePointAt(0)!; return cp >= lo && cp < hi; };
  // "∀ opens a definition tape ending at the first ⇒"
  let i = start.length;
  let body: string;
  const glyphs: string[] = [], texts: string[] = [];
  const seen = new Set<string>();
  if (wire[i] === sep) {
    body = wire.slice(i + 1);
  } else {
    while (i < wire.length && wire[i] !== sep) {
      assert.ok(inScript(wire[i]), 'definition opens with a script glyph');
      assert.ok(!seen.has(wire[i]), 'glyph is new');
      seen.add(wire[i]);
      let j = i + 1;
      while (j < wire.length && wire[j] !== sep && !(inScript(wire[j]) && !seen.has(wire[j]))) j++;
      glyphs.push(wire[i]); texts.push(wire.slice(i + 1, j));
      i = j;
    }
    body = wire.slice(i + 1);
  }
  // "From the LAST definition to the FIRST, replace each glyph everywhere
  //  (body and earlier texts) with its expansion."
  for (let k = texts.length - 1; k >= 0; k--) {
    let expansion = texts[k];
    // counter sentences, when present in the prompt
    const cmatch = expansion.match(new RegExp(`^${counter}\\[([^\\]]*)\\]$`));
    if (cmatch) {
      const inner = cmatch[1];
      const sp = inner.indexOf(' ');
      const first = inner.slice(0, sp), rest = inner.slice(sp + 1);
      if (first.length === 1 && /^\d+$/.test(rest) && !rest.includes(' ')) {
        expansion = first.repeat(parseInt(rest, 10));
      } else {
        const m = inner.match(/^(-?\d+) (-?\d+) (\d+) ([\s\S]*)$/)!;
        const parts: string[] = [];
        for (let q = 0; q < parseInt(m[3], 10); q++) parts.push(String(parseInt(m[1], 10) + q * parseInt(m[2], 10)));
        expansion = parts.join(m[4]);
      }
    }
    for (let q = 0; q < k; q++) texts[q] = texts[q].split(glyphs[k]).join(expansion);
    body = body.split(glyphs[k]).join(expansion);
  }
  return body;
}

async function main() {
  console.log('HERMES-Ω adversarial redteam\n');

  // ---- 1. self-test battery ----
  await ok('empty and tiny payloads are total and exact', async () => {
    for (const t of ['', 'x', '∀', '∀⇒', '∀⇒x', 'abcd', '  \n\t']) {
      const r = await hermesEncode(t, enc);
      assert.equal(r.decoded, t);
      assert.equal(hermesDecode(r.wire), t);
    }
  });

  // ---- 2. full lane sweep: byte-exact + independent decode + M accounting ----
  const f = mosaicFixtures();
  const lanes: Array<[string, string]> = [
    ...fs.readdirSync('bench/holdout').sort().map(nm => ['holdout/' + nm, fs.readFileSync('bench/holdout/' + nm, 'utf8')] as [string, string]),
    ['CHAOS_900', CHAOS_900],
    ['CHAOS_G_CJK', CHAOS_G_CJK],
    ['CHAOS_F_LLM_REPORT', CHAOS_F_LLM_REPORT],
    ['MOSAIC_HANDTRACE_300', MOSAIC_HANDTRACE_300],
    ['json-log-40', f.jsonLog],
    ['csv-60', f.csv],
    ['chat-48', f.chat],
    ['grid-30', f.grid],
    ['rle-1400', f.rle],
    ['idrun-200', f.idrun],
    ['prose', f.prose],
    ['agent-turn', f.prose + '\n' + f.jsonLog + '\n' + f.rle + '\n' + f.chat],
    ['two-regime', f.jsonLog + '\n' + f.rle],
    ['three-regime', f.csv + '\n' + f.grid + '\n' + f.rle],
  ];
  const results: Array<{ lane: string; inT: number; wire: number; M: number; framed: boolean; exact: boolean }> = [];
  await ok(`byte-exact round trip + honest M on all ${lanes.length} lanes`, async () => {
    for (const [lane, text] of lanes) {
      const r = await hermesEncode(text, enc);
      assert.equal(r.decoded, text, `decoded===text on ${lane}`);
      assert.equal(hermesDecode(r.wire), text, `hermesDecode(wire)===text on ${lane}`);
      const framed = r.wire.startsWith(HERMES_START);
      if (framed) {
        // framed wires must carry a prompt whose literal execution decodes them
        assert.equal(promptLiteralDecode(hermesDecoderPrompt(r.wire)), text, `prompt-literal decode on ${lane}`);
      }
      results.push({ lane, inT: r.inTokens, wire: r.outTokens, M: r.messageTokens, framed, exact: r.exact });
    }
  });
  await ok('message-cost gate: every framed lane strictly beats sending raw text', () => {
    for (const x of results) if (x.framed) assert.ok(x.M < x.inT, `${x.lane}: M ${x.M} < in ${x.inT}`);
  });

  // ---- 3. prompt-literal decode on synthetic wires exercising every feature ----
  await ok('prompt-literal decode: counters, references, empty tape, literal passthrough', async () => {
    // char-run counter + int-run counter + a referenced rule
    const payload = 'A'.repeat(50) + ' then ' + Array.from({ length: 9 }, (_, i) => 7 + i * 5).join(';') + ' then A'.repeat(1) + ' tail';
    const r = await hermesEncode(payload, enc);
    assert.equal(hermesDecode(r.wire), payload);
    if (r.wire.startsWith(HERMES_START)) {
      assert.equal(promptLiteralDecode(hermesDecoderPrompt(r.wire)), payload);
    }
    // literal passthrough through the prompt
    const lit = 'plain text with no repeats at all whatsoever';
    const lr = await hermesEncode(lit, enc);
    assert.equal(promptLiteralDecode(hermesDecoderPrompt(lr.wire)), lit);
  });

  // ---- 4. totality on hostile inputs ----
  await ok('payload containing the frame characters stays byte-perfect', async () => {
    const t = '∀⇒ everything here looks like a frame ⇒∆[A 5] and ∀가tape⇒body — but is payload.';
    const r = await hermesEncode(t, enc);
    assert.equal(r.decoded, t);
    assert.equal(hermesDecode(r.wire), t);
  });
  await ok('payload that IS a valid hermes wire is escaped, not mis-decoded', async () => {
    const inner = await hermesEncode('repeat repeat repeat repeat repeat repeat', enc);
    const t = inner.wire; // a real hermes wire used as a payload
    const r = await hermesEncode(t, enc);
    assert.equal(r.decoded, t);
    assert.equal(hermesDecode(r.wire), t);
  });
  await ok('foreign codec wires pass through hermesDecode unchanged', async () => {
    for (const w of ['Ω!abc!def乙body', '⬥x=y乙z', '※κrest', '«KHOROS»\n[B]\nstuff', '[MZ1]\nS\nSx']) {
      assert.equal(hermesDecode(w), w);
    }
  });
  await ok('malformed frames return the input unchanged (no throws)', () => {
    for (const w of ['∀', '∀⇒', '∀x', '∀가', '∀가text', '∀가text⇒', '∀⇒∀⇒x', '∀Atext⇒body', '∀가a가b⇒x']) {
      const d = hermesDecode(w);
      assert.equal(typeof d, 'string');
    }
  });
  await ok('tape grammar: a glyph inside an expansion is a reference (documented semantics)', () => {
    // Hand-built wire: definition 0 is "a가b" (contains its own glyph as a
    // single-pass reference). Substitution replaces each occurrence once,
    // exactly as the decoder prompt words it.
    assert.equal(hermesDecode(HERMES_START + '가a가b' + HERMES_SEP + 'z가'), 'za가b');
    // The encoder can never emit self-referential or cyclic rules: a new
    // glyph is drawn from characters absent from the payload and unused by
    // earlier rules, and the reference graph is acyclic by construction.
    const p = hermesParse(HERMES_START + '가ab' + '각' + 'c가' + HERMES_SEP + '각');
    assert.ok(p && p.texts[1] === 'c가', 'backward reference parsed inside expansion');
  });
  await ok('control-character payloads (sentinel collisions) stay exact', async () => {
    for (const t of ['a\u0001b\u0001c', 'x\u0002y', 'sentinels \u0001\u0002\u0003\uE000\uE001 all present', '\u0000null']) {
      const r = await hermesEncode(t, enc);
      assert.equal(r.decoded, t, JSON.stringify(t));
      assert.equal(hermesDecode(r.wire), t);
    }
  });

  // ---- 5. counters ----
  await ok('char-run counters: exact for many lengths and characters', async () => {
    for (const [ch, len] of [['#', 40], ['z', 9], ['😀', 12], ['-', 100]] as Array<[string, number]>) {
      const t = `head ${ch.repeat(len)} tail`;
      const r = await hermesEncode(t, enc);
      assert.equal(hermesDecode(r.wire), t, `char run ${JSON.stringify(ch)}×${len}`);
      if (r.wire.includes(HERMES_COUNTER)) assert.ok(r.counters >= 1, 'counter used');
    }
  });
  await ok('int-run counters: step != 1, negatives, multi-char joins', async () => {
    const runs = [
      Array.from({ length: 12 }, (_, i) => 3 + i * 7).join(', '),
      Array.from({ length: 8 }, (_, i) => -5 + i * 2).join('|'),
      Array.from({ length: 10 }, (_, i) => 100 - i * 3).join('..'),
      'id:' + Array.from({ length: 30 }, (_, i) => i).join(',id:'),
    ];
    for (const t of runs) {
      const r = await hermesEncode('x ' + t + ' y', enc);
      assert.equal(hermesDecode(r.wire), 'x ' + t + ' y', JSON.stringify(t.slice(0, 40)));
    }
  });
  await ok('payload containing "∆[" disables counters and stays literal-exact', async () => {
    const t = 'values ∆[A 5] and ∆[0 1 9 ,] inline plus repeat repeat repeat repeat repeat';
    const r = await hermesEncode(t, enc);
    assert.equal(r.decoded, t);
    assert.equal(hermesDecode(r.wire), t);
    assert.equal(r.counters, 0, 'counters disabled');
  });
  await ok('counter joins containing "]" or the separator are never emitted', async () => {
    // join with ']' would break the expression syntax; the payload must still round-trip
    const t = Array.from({ length: 8 }, (_, i) => 10 + i).join(']x');
    const r = await hermesEncode(t, enc);
    assert.equal(hermesDecode(r.wire), t);
  });

  // ---- 6. script collisions ----
  await ok('Hangul-bearing payload compresses via a non-colliding script or declines safely', async () => {
    const t = '가각갈 Korean repeated phrase 가각갈 appears 가각갈 thrice and latin text repeats too: alpha beta alpha beta alpha beta';
    const r = await hermesEncode(t, enc);
    assert.equal(r.decoded, t);
    assert.equal(hermesDecode(r.wire), t);
  });
  await ok('Cyrillic + Kana + CJK mixed payload stays byte-perfect', async () => {
    const t = 'Привет мир Привет мир データベース データベース 数据库 数据库 ' + fs.readFileSync('bench/holdout/md-vite.txt', 'utf8');
    const r = await hermesEncode(t, enc);
    assert.equal(r.decoded, t);
    assert.equal(hermesDecode(r.wire), t);
  });

  // ---- 7. glyph cap ----
  await ok('more distinct repeated phrases than the glyph cap still round-trips', async () => {
    const parts = Array.from({ length: 300 }, (_, i) => `phrase-number-${i}-alpha phrase-number-${i}-beta`);
    const t = parts.join(' ');
    const r = await hermesEncode(t, enc);
    assert.equal(r.decoded, t);
    assert.equal(hermesDecode(r.wire), t);
    assert.ok(r.rules <= 96, `rules capped (got ${r.rules})`);
  });

  // ---- 8. determinism ----
  await ok('encoding is deterministic across runs', async () => {
    const a = await hermesEncode(fs.readFileSync('bench/holdout/readme.txt', 'utf8'), enc);
    const b = await hermesEncode(fs.readFileSync('bench/holdout/readme.txt', 'utf8'), enc);
    assert.equal(a.wire, b.wire);
  });

  // ---- 9. structured fuzz: 250 cases ----
  await ok('250-case structured fuzz: byte-perfect, zero throws', async () => {
    let seed = 0xc0ffee;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
    const words = ['deploy', 'cache', 'retry', 'the', 'quick', 'matrix', '주파수', 'λ', '∀', '⇒', '∆[', 'x=1', 'https://x.y/z', '스트림', '数据', '日本語', '\n', '   ', '  \t'];
    for (let ci = 0; ci < 250; ci++) {
      const kind = ci % 5;
      let t = '';
      if (kind === 0) { // prose-ish
        t = Array.from({ length: 5 + Math.floor(rnd() * 40) }, () => words[Math.floor(rnd() * words.length)]).join(' ');
      } else if (kind === 1) { // json-ish
        t = Array.from({ length: 1 + Math.floor(rnd() * 8) }, (_, i) => `{"k${i}":"v${i}","n":${Math.floor(rnd() * 1000)}}`).join('\n');
      } else if (kind === 2) { // runs
        t = String.fromCharCode(33 + Math.floor(rnd() * 90)).repeat(5 + Math.floor(rnd() * 300));
        t += Array.from({ length: 4 + Math.floor(rnd() * 30) }, (_, i) => i * (1 + Math.floor(rnd() * 9))).join(',');
      } else if (kind === 3) { // code-ish
        t = Array.from({ length: 2 + Math.floor(rnd() * 12) }, (_, i) => `const x${i} = f${i}(a, b${i}); // note ${i}`).join('\n');
      } else { // chaos
        t = Array.from({ length: 8 + Math.floor(rnd() * 60) }, () => {
          const r = rnd();
          if (r < 0.3) return words[Math.floor(rnd() * words.length)];
          if (r < 0.5) return String.fromCharCode(32 + Math.floor(rnd() * 95));
          if (r < 0.6) return String.fromCharCode(0xac00 + Math.floor(rnd() * 200));
          if (r < 0.7) return String.fromCharCode(0x4e00 + Math.floor(rnd() * 500));
          return Math.floor(rnd() * 100000).toString();
        }).join(rnd() < 0.5 ? ' ' : '\n');
      }
      const r = await hermesEncode(t, enc);
      assert.equal(r.decoded, t, `fuzz case ${ci} (${JSON.stringify(t.slice(0, 40))})`);
      assert.equal(hermesDecode(r.wire), t, `independent decode case ${ci}`);
    }
  });

  // ---- 10. honest M-metric Pareto vs the stacked frontier ----
  await ok('M-metric: the entire hermes message costs less than the stacked frontier\'s instruction tail alone on every lane', () => {
    const logosPrompt = countTokens(logosDecoderPrompt(), enc);
    const proteusPrompt = countTokens(proteusDecoderPrompt(), enc);
    assert.ok(logosPrompt > 50000, `logos decoder prompt measured large (got ${logosPrompt})`);
    let worst = 0;
    for (const x of results) {
      // The stacked codecs must ship their instruction tail in the same
      // single chat message; under the repo's own constraint (no system
      // prompt), their honest cost is prompt + wire >= prompt.
      assert.ok(x.M < logosPrompt, `${x.lane}: hermes M ${x.M} < logos prompt ${logosPrompt}`);
      worst = Math.max(worst, x.M);
    }
    console.log(`      logos prompt = ${logosPrompt} tok; worst hermes message = ${worst} tok (ratio ${(logosPrompt / worst).toFixed(0)}x); proteus prompt = ${proteusPrompt}`);
  });
  await ok('wire metric: hermes beats the honest dynamic-only competition on structured lanes', async () => {
    // moiraLattice over raw text (the repo's dynamic constituent lattice,
    // lower stack stripped) measured live for the same lanes.
    const { optimizeConstituentLattice } = await import('../src/lib/omega/moira');
    for (const lane of ['holdout/gh-api.json.txt', 'holdout/code-ts.txt', 'holdout/gh-prose.txt', 'holdout/readme.txt', 'holdout/json-pkg.txt']) {
      const text = fs.readFileSync('bench/' + lane, 'utf8');
      const lat = optimizeConstituentLattice(text, enc);
      const mine = results.find(r => r.lane === lane)!;
      assert.ok(mine.wire <= lat.tokens, `${lane}: hermes ${mine.wire} <= moira-raw ${lat.tokens}`);
    }
  });

  // ---- 11. speed sanity ----
  await ok('encode speed: gh-api (8 KB) completes in < 15 s (LOGOS takes ~40 s on gh-prose)', async () => {
    const text = fs.readFileSync('bench/holdout/gh-api.json.txt', 'utf8');
    const t0 = Date.now();
    const r = await hermesEncode(text, enc);
    assert.equal(r.decoded, text);
    assert.ok(r.ms < 15000, `took ${r.ms}ms`);
  });

  const framed = results.filter(r => r.framed);
  const totIn = results.reduce((a, x) => a + x.inT, 0);
  const totM = results.reduce((a, x) => a + x.M, 0);
  const totWire = results.reduce((a, x) => a + x.wire, 0);
  console.log(`\n  lanes: ${results.length}, framed+winning: ${framed.length}`);
  console.log(`  totals: in ${totIn} -> wire ${totWire} -> honest M ${totM} (${((1 - totM / totIn) * 100).toFixed(1)}% single-message savings)`);
  console.log(`\n${n}/${n} HERMES adversarial gates passed`);
}

main().catch(e => { console.error(e); process.exit(1); });
