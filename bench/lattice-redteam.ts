/**
 * bench/lattice-redteam.ts — second-order adversary for LATTICE-LT1.
 *
 * Attacks are derived from LATTICE's OWN structure, not from a generic list:
 *  L1 self-delimiting header ambiguity (the mechanism's single sharpest edge)
 *  L2 glyph counterfeiting / pool-soaked sources
 *  L3 recursive-definition citation order (a definition may only cite earlier)
 *  L4 degenerate & boundary inputs (empty, 1 char, all-same, no repeats)
 *  L5 Unicode integrity (astral planes, combining marks, lone surrogates, BOM)
 *  L6 never-worse monotonicity (the Pareto predicate itself) + determinism
 *  L7 cross-encoding parity (cl100k_base)
 *  L8 randomized differential fuzz, byte-exactness on every sample
 *  L9 namespace disjointness from every sibling lane's glyph pool
 * L10 integration: ROSETTA must never regress once LATTICE is a member
 */
import { latticeEncode, latticeDecode, latticePool } from '@/lib/omega/lattice';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { rosettaEncode, rosettaDecode, rosettaPool } from '@/lib/omega/rosetta';
import { phraseCodebook } from '@/lib/omega/phrase';
import { ideographPool } from '@/lib/omega/strata';
import { CHAOS_900, CHAOS_G_CJK, MOSAIC_HANDTRACE_300, mosaicFixtures } from './fixtures';
import fs from 'node:fs';

let pass = 0, fail = 0;
const ok = (c: boolean, label: string, extra = '') => {
  if (c) pass++; else { fail++; console.log(`  ✗ ${label} ${extra}`); }
};

/** The core contract: exact round-trip and never worse than the input. */
function contract(t: string, enc: EncodingName, label: string) {
  const r = latticeEncode(t, enc);
  const back = latticeDecode(r.wire, enc);
  ok(back === t, `${label}: byte-exact round-trip`, `${enc} mode=${r.mode}`);
  ok(r.decoded === t, `${label}: self-reported decode matches`, enc);
  ok(r.exact, `${label}: exact flag`, enc);
  const wireTok = countTokens(r.wire, enc);
  ok(wireTok === r.outTokens, `${label}: reported outTokens is the real count`, `${r.outTokens} vs ${wireTok}`);
  if (r.mode !== 'forced-wrap') {
    ok(r.outTokens <= r.inTokens, `${label}: never worse than identity`, `${r.inTokens}->${r.outTokens}`);
  }
  return r;
}

function xorshift(seed: number) {
  let x = seed | 0 || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
}

async function main() {
  const enc: EncodingName = 'o200k_base';
  const f = mosaicFixtures();
  const pool = latticePool(enc);
  const MARK = pool[0], END = pool[1];

  console.log('L1 — self-delimiting header ambiguity');
  {
    // A source containing the MARK must never be silently mis-parsed.
    const t1 = MARK + 'hello world '.repeat(20);
    const r1 = contract(t1, enc, 'L1 leading MARK');
    ok(r1.mode === 'forced-wrap' || r1.mode === 'identity', 'L1: leading MARK takes a safe lane', r1.mode);
    contract('x' + MARK + 'y'.repeat(200), enc, 'L1 interior MARK');
    contract(END + 'abc '.repeat(60), enc, 'L1 leading END');
    contract(MARK + END + 'abc '.repeat(60), enc, 'L1 leading MARK+END');
    // Decoder totality on foreign/garbage wires: must return input unchanged.
    ok(latticeDecode('plain text', enc) === 'plain text', 'L1: foreign wire passthrough');
    ok(latticeDecode(MARK, enc) === MARK, 'L1: truncated wire (mark only) passthrough');
    ok(latticeDecode(MARK + 'nodefs', enc) === MARK + 'nodefs', 'L1: wire with no END passthrough');
    ok(latticeDecode('', enc) === '', 'L1: empty wire passthrough');
  }

  console.log('L2 — glyph counterfeiting / pool-soaked sources');
  {
    // Source saturated with pool glyphs: folding must be refused, not faked.
    const soak = pool.slice(0, 200).join('') + ' repeated phrase here'.repeat(30);
    contract(soak, enc, 'L2 soaked');
    const allGlyphs = pool.join('').repeat(3);
    contract(allGlyphs, enc, 'L2 all-glyph source');
    // A glyph that appears literally must survive verbatim.
    const g = pool[7];
    const lit = ('the value is ' + g + ' and repeats. ').repeat(25);
    const r = contract(lit, enc, 'L2 literal glyph survives');
    ok(!r.entries.some((e) => e.glyph === g), 'L2: a source-present glyph is never bound', g);
    // A used glyph must be SKIPPED, not cause the whole encode to collapse to
    // identity: this separates the G1 gate from the G2 safety net behind it.
    ok(r.mode === 'lattice' && r.outTokens < r.inTokens,
      'L2: a source-present glyph only removes that glyph, compression survives',
      `${r.mode} ${r.inTokens}->${r.outTokens}`);
    const gLow = pool[2];
    const lit2 = ('row ' + gLow + ' repeated payload value. ').repeat(30);
    const r2 = contract(lit2, enc, 'L2 lowest glyph present');
    ok(r2.mode === 'lattice' && r2.outTokens < r2.inTokens,
      'L2: lowest-index glyph present still compresses', `${r2.mode} ${r2.inTokens}->${r2.outTokens}`);
  }

  console.log('L3 — recursive definition citation order');
  {
    // Nested repeats: "alpha beta gamma" inside "alpha beta gamma delta".
    const nest = ('alpha beta gamma delta epsilon. ').repeat(20) + ('alpha beta gamma. ').repeat(20);
    const r = contract(nest, enc, 'L3 nested repeats');
    // Every definition may only cite strictly-earlier glyphs. Re-parse the
    // header exactly as the decoder does and assert the citation order.
    let acyclic = true;
    {
      const header = r.wire.slice(MARK.length, r.wire.indexOf(END));
      const poolSet = new Set(pool.slice(2));
      const bound: string[] = [];
      const rawDef = new Map<string, string>();
      let cur: string | null = null, buf = '';
      for (const ch of header) {
        if (poolSet.has(ch) && !rawDef.has(ch)) {
          if (cur !== null) rawDef.set(cur, buf);
          cur = ch; buf = ''; bound.push(ch); continue;
        }
        buf += ch;
      }
      if (cur !== null) rawDef.set(cur, buf);
      ok(bound.length === r.entries.length,
        'L3: header parses to exactly the reported entry count',
        `${bound.length} vs ${r.entries.length}`);
      for (let i = 0; i < bound.length; i++) {
        const later = new Set(bound.slice(i));   // self + all later glyphs
        for (const ch of rawDef.get(bound[i]) ?? '') if (later.has(ch)) acyclic = false;
      }
    }
    ok(acyclic, 'L3: definitions form a DAG (no forward citation)');
    ok(r.outTokens < r.inTokens, 'L3: nested structure actually compresses', `${r.inTokens}->${r.outTokens}`);
    contract(('ab').repeat(400), enc, 'L3 deep self-similar');
    contract(('x y ').repeat(500), enc, 'L3 two-token cycle');
  }

  console.log('L4 — degenerate & boundary inputs');
  {
    for (const t of ['', ' ', 'a', 'ab', '\n', '\n\n\n', 'a'.repeat(3000), ' '.repeat(2000),
      'no repeats here at all zqx', '0123456789'.repeat(1)]) {
      contract(t, enc, `L4 ${JSON.stringify(t.slice(0, 12))}(${t.length})`);
    }
  }

  console.log('L5 — Unicode integrity');
  {
    const cases: [string, string][] = [
      ['astral', '😀🚀🧬 payload line. '.repeat(40)],
      ['combining', 'é\u0301 café naïve résumé. '.repeat(40)],
      ['rtl', 'مرحبا بالعالم شكرا لك. '.repeat(40)],
      ['cjk', '数据库迁移已完成，请检查连接池配置。'.repeat(40)],
      ['bom', '\uFEFF' + 'header row value. '.repeat(40)],
      ['nul', 'a\u0000b\u0000c '.repeat(60)],
      ['crlf', 'line one\r\nline two\r\n'.repeat(50)],
      ['zwj', '👨‍👩‍👧‍👦 family emoji. '.repeat(30)],
      ['replacement', '\uFFFD odd char here. '.repeat(40)],
      ['mixed', CHAOS_G_CJK],
    ];
    for (const [n, t] of cases) contract(t, enc, `L5 ${n}`);
  }

  console.log('L6 — never-worse monotonicity + determinism');
  {
    const corpus: Array<[string, string]> = [
      ['chaos900', CHAOS_900], ['chaosG', CHAOS_G_CJK], ['handtrace', MOSAIC_HANDTRACE_300],
      ['jsonLog', f.jsonLog], ['csv', f.csv], ['chat', f.chat], ['grid', f.grid],
      ['rle', f.rle], ['idrun', f.idrun], ['prose', f.prose],
    ];
    if (fs.existsSync('bench/holdout')) {
      for (const fn of fs.readdirSync('bench/holdout')) {
        corpus.push(['holdout:' + fn, fs.readFileSync('bench/holdout/' + fn, 'utf8')]);
      }
    }
    for (const [n, t] of corpus) {
      const a = contract(t, enc, `L6 ${n}`);
      const b = latticeEncode(t, enc);
      ok(a.wire === b.wire, `L6 ${n}: deterministic (identical wire on re-encode)`);
      // Encoding a wire again must still be exact (no state leakage).
      const c = latticeEncode(a.wire, enc);
      ok(latticeDecode(c.wire, enc) === a.wire, `L6 ${n}: wire-of-wire is exact`);
    }
  }

  console.log('L7 — cross-encoding parity (cl100k_base)');
  {
    const e2: EncodingName = 'cl100k_base';
    for (const [n, t] of [['chaos900', CHAOS_900], ['csv', f.csv], ['chat', f.chat],
      ['prose', f.prose], ['chaosG', CHAOS_G_CJK]] as Array<[string, string]>) {
      contract(t, e2, `L7 ${n}`);
    }
    // A wire made under one encoding must not be decoded under the other as
    // if it were native: pools differ, so the mark differs.
    const w = latticeEncode(f.chat, enc).wire;
    const cross = latticeDecode(w, e2);
    ok(cross === w || cross === f.chat, 'L7: cross-encoding decode is safe (passthrough or correct)');
  }

  console.log('L8 — randomized differential fuzz');
  {
    const rnd = xorshift(20260921);
    const alphabets = ['abcdefg ', 'AB', '0123456789,;\n', 'αβγ ΔΕ\n', '{}[]":,\n abc', '亜唖娃阿哀 \n'];
    let worst = 0;
    for (let i = 0; i < 140; i++) {
      const al = alphabets[Math.floor(rnd() * alphabets.length)];
      const len = 20 + Math.floor(rnd() * 1800);
      // Build with a planted repeat so the mechanism is actually exercised.
      const motif = Array.from({ length: 3 + Math.floor(rnd() * 12) },
        () => al[Math.floor(rnd() * al.length)]).join('');
      let s = '';
      while (s.length < len) s += rnd() < 0.45 ? motif : al[Math.floor(rnd() * al.length)];
      const r = latticeEncode(s, enc);
      const back = latticeDecode(r.wire, enc);
      if (back !== s) { fail++; console.log(`  ✗ L8 fuzz #${i} round-trip`, JSON.stringify(s.slice(0, 60))); }
      else pass++;
      if (r.mode !== 'forced-wrap' && r.outTokens > r.inTokens) {
        fail++; console.log(`  ✗ L8 fuzz #${i} worse than identity`);
      } else pass++;
      worst = Math.max(worst, r.outTokens - r.inTokens);
    }
    ok(worst <= 0, 'L8: no fuzz sample ever exceeded identity', `worst delta=${worst}`);
  }

  console.log('L9 — namespace disjointness from sibling lanes');
  {
    for (const e of ['o200k_base', 'cl100k_base'] as EncodingName[]) {
      const lp = latticePool(e);
      const rp = new Set(rosettaPool(e));
      const pc = new Set(phraseCodebook(e).byGlyph.keys());
      const ip = new Set(ideographPool(e));
      ok(lp.length >= 8, `L9 ${e}: pool is usable`, String(lp.length));
      ok(lp.every((g) => !rp.has(g)), `L9 ${e}: disjoint from ROSETTA pool`);
      ok(lp.every((g) => !pc.has(g)), `L9 ${e}: disjoint from PHRASEBOOK glyphs`);
      ok(lp.every((g) => !ip.has(g)), `L9 ${e}: disjoint from CJK ideograph pool`);
      ok(new Set(lp).size === lp.length, `L9 ${e}: pool has no duplicates`);
      ok(lp.every((g) => countTokens(g, e) === 1), `L9 ${e}: every glyph is exactly 1 token`);
    }
  }

  console.log('L10 — ROSETTA integration: strictly no regression');
  {
    const corpus: Array<[string, string]> = [
      ['chaos900', CHAOS_900], ['chaosG', CHAOS_G_CJK], ['handtrace', MOSAIC_HANDTRACE_300],
      ['jsonLog', f.jsonLog], ['csv', f.csv], ['chat', f.chat], ['grid', f.grid],
      ['rle', f.rle], ['idrun', f.idrun], ['prose', f.prose],
      ['agent', f.prose + '\n' + f.jsonLog + '\n' + f.rle + '\n' + f.chat],
    ];
    if (fs.existsSync('bench/holdout')) {
      for (const fn of fs.readdirSync('bench/holdout')) {
        corpus.push(['holdout:' + fn, fs.readFileSync('bench/holdout/' + fn, 'utf8')]);
      }
    }
    for (const [n, t] of corpus) {
      const r = await rosettaEncode(t, enc);
      ok(rosettaDecode(r.wire, enc) === t, `L10 ${n}: ROSETTA wire byte-exact`, r.member);
      ok(r.outTokens <= r.inTokens, `L10 ${n}: ROSETTA never worse`, `${r.inTokens}->${r.outTokens}`);
      const lt = latticeEncode(t, enc);
      ok(r.outTokens <= lt.outTokens, `L10 ${n}: ROSETTA ≤ standalone LATTICE (min is taken)`,
        `${r.outTokens} vs ${lt.outTokens} member=${r.member}`);
    }
  }

  console.log(`\nLATTICE RED-TEAM: ${pass} pass / ${fail} fail`);
  if (fail > 0) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
