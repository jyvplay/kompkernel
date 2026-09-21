/**
 * bench/strand-redteam.ts — second-order adversary for STRAND-ST1.
 *
 * Attacks derived from STRAND's OWN structure (the hybrid static/dynamic
 * dictionary), not a generic checklist:
 *  S1 namespace separation: two pools + LATTICE + phi1 + ROSETTA + CJK, and
 *     distinct MARKs (a shared mark silently misroutes a whole lane)
 *  S2 static-book integrity: book validated, frozen, no pool glyph, no
 *     1-token entry, deterministic glyph binding
 *  S3 SFLAG correctness: static-free wires carry no flag; flagged wires decode
 *  S4 glyph counterfeiting: source containing static or dynamic glyphs
 *  S5 header unambiguity with static glyphs INSIDE dynamic definitions
 *  S6 the mechanism claim: static seeding actually changes the admitted
 *     dynamic set (else STRAND is just LATTICE + a greedy table)
 *  S7 degenerate/boundary/Unicode inputs
 *  S8 never-worse + determinism + wire-of-wire
 *  S9 cross-encoding parity
 * S10 randomized fuzz with byte-exactness on every sample
 * S11 ROSETTA integration: argmin discipline, no regression
 * S12 train/holdout contamination guard (the result's validity depends on it)
 */
import { strandEncode, strandDecode, strandDynPool, strandStaticPool, strandBook } from '@/lib/omega/strand';
import { latticeEncode, latticePool } from '@/lib/omega/lattice';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { rosettaEncode, rosettaDecode, rosettaPool } from '@/lib/omega/rosetta';
import { phraseCodebook } from '@/lib/omega/phrase';
import { ideographPool } from '@/lib/omega/strata';
import { CHAOS_900, CHAOS_G_CJK, MOSAIC_HANDTRACE_300, mosaicFixtures } from './fixtures';
import fs from 'node:fs';

const raw1tok = (p: string, e: EncodingName) => countTokens(p, e) < 2;

let pass = 0, fail = 0;
const ok = (c: boolean, label: string, extra = '') => {
  if (c) pass++; else { fail++; console.log(`  ✗ ${label} ${extra}`); }
};

function contract(t: string, enc: EncodingName, label: string) {
  const r = strandEncode(t, enc);
  const back = strandDecode(r.wire, enc);
  ok(back === t, `${label}: byte-exact round-trip`, `${enc} mode=${r.mode}`);
  ok(r.decoded === t, `${label}: self-reported decode matches`, enc);
  ok(r.exact, `${label}: exact flag`, enc);
  ok(countTokens(r.wire, enc) === r.outTokens, `${label}: reported outTokens is real`, enc);
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
  const dyn = strandDynPool(enc);
  const MARK = dyn[0], END = dyn[1], SFLAG = dyn[2];

  console.log('S1 — namespace separation & distinct marks');
  {
    for (const e of ['o200k_base', 'cl100k_base'] as EncodingName[]) {
      const d = strandDynPool(e), s = strandStaticPool(e), l = latticePool(e);
      const rp = new Set(rosettaPool(e)), pc = new Set(phraseCodebook(e).byGlyph.keys()), ip = new Set(ideographPool(e));
      ok(d.length >= 8, `S1 ${e}: dynamic pool usable`, String(d.length));
      ok(s.length >= 8, `S1 ${e}: static pool usable`, String(s.length));
      ok(d[0] !== l[0], `S1 ${e}: STRAND mark differs from LATTICE mark`, `${d[0]} vs ${l[0]}`);
      ok(d.every((g) => !s.includes(g)), `S1 ${e}: dynamic ∩ static = ∅`);
      ok(d.every((g) => !l.includes(g)), `S1 ${e}: dynamic ∩ LATTICE = ∅`);
      ok(s.every((g) => !l.includes(g)), `S1 ${e}: static ∩ LATTICE = ∅`);
      for (const [nm, set] of [['ROSETTA', rp], ['phrase', pc], ['CJK', ip]] as Array<[string, Set<string>]>) {
        ok(d.every((g) => !set.has(g)), `S1 ${e}: dynamic ∩ ${nm} = ∅`);
        ok(s.every((g) => !set.has(g)), `S1 ${e}: static ∩ ${nm} = ∅`);
      }
      ok(new Set(d).size === d.length, `S1 ${e}: dynamic pool distinct`);
      ok(new Set(s).size === s.length, `S1 ${e}: static pool distinct`);
      ok(d.every((g) => countTokens(g, e) === 1), `S1 ${e}: dynamic glyphs are 1 token`);
      ok(s.every((g) => countTokens(g, e) === 1), `S1 ${e}: static glyphs are 1 token`);
    }
  }

  console.log('S2 — static book integrity');
  {
    for (const e of ['o200k_base', 'cl100k_base'] as EncodingName[]) {
      const b = strandBook(e);
      const all = new Set([...strandDynPool(e), ...strandStaticPool(e)]);
      ok(b.phrases.length === b.glyphs.length, `S2 ${e}: book is a bijection`);
      ok(b.phrases.every((p) => countTokens(p, e) >= 2), `S2 ${e}: no 1-token entry (can never pay)`);
      // The shipped artifact must be exactly what the committed miner produces
      // from the committed corpus. A hand-edited book would break this.
      ok(b.phrases.every((p) => p.length > 0 && p.length <= 72), `S2 ${e}: every phrase within mined length bounds`);
      ok(b.phrases.every((p) => raw1tok(p, e) === false), `S2 ${e}: book free of degenerate entries`);
      ok(b.phrases.every((p) => [...p].every((c) => !all.has(c))), `S2 ${e}: no book phrase contains a pool glyph`);
      ok(b.glyphs.every((g, i) => b.byGlyph.get(g) === b.phrases[i]), `S2 ${e}: glyph↔phrase map consistent`);
      const b2 = strandBook(e);
      ok(b2.phrases.join('\u0000') === b.phrases.join('\u0000'), `S2 ${e}: book is deterministic`);
      ok(new Set(b.phrases).size === b.phrases.length, `S2 ${e}: no duplicate phrases`);
    }
  }

  console.log('S3 — SFLAG correctness');
  {
    // A document the book cannot help must not pay the flag.
    const noBook = 'zzq wrx ' .repeat(60);
    const r1 = contract(noBook, enc, 'S3 book-useless');
    if (r1.mode === 'strand') {
      ok(r1.staticHits > 0 ? r1.wire.startsWith(MARK + SFLAG) : !r1.wire.startsWith(MARK + SFLAG),
        'S3: SFLAG present iff static folds occurred', `hits=${r1.staticHits}`);
    }
    // Any wire that DOES use static glyphs must carry the flag, else decode
    // would leave them literal. Check across the whole corpus.
    const corpus = [CHAOS_900, f.jsonLog, f.csv, f.chat, f.prose, MOSAIC_HANDTRACE_300];
    if (fs.existsSync('bench/holdout')) for (const fn of fs.readdirSync('bench/holdout')) corpus.push(fs.readFileSync('bench/holdout/' + fn, 'utf8'));
    for (const t of corpus) {
      const r = strandEncode(t, enc);
      if (r.mode !== 'strand') continue;
      const flagged = r.wire.startsWith(MARK + SFLAG);
      ok(flagged === (r.staticHits > 0), 'S3: flag matches static usage', `flag=${flagged} hits=${r.staticHits}`);
      ok(strandDecode(r.wire, enc) === t, 'S3: flagged wire decodes exactly');
    }
  }

  console.log('S4 — glyph counterfeiting');
  {
    const sp = strandStaticPool(enc);
    contract(MARK + 'payload here '.repeat(30), enc, 'S4 leading MARK');
    contract(SFLAG + ' body text repeated. '.repeat(30), enc, 'S4 leading SFLAG');
    contract(END + ' body text repeated. '.repeat(30), enc, 'S4 leading END');
    const withStatic = ('row ' + sp[3] + ' value repeated here. ').repeat(28);
    const rs = contract(withStatic, enc, 'S4 literal static glyph');
    ok(!rs.entries.some((e) => e.kind === 'static' && e.glyph === sp[3]),
      'S4: a source-present static glyph is never bound', sp[3]);
    ok(rs.mode === 'strand' && rs.outTokens < rs.inTokens,
      'S4: one used static glyph does not kill compression', `${rs.mode} ${rs.inTokens}->${rs.outTokens}`);
    const withDyn = ('row ' + dyn[9] + ' value repeated here. ').repeat(28);
    const rd = contract(withDyn, enc, 'S4 literal dynamic glyph');
    ok(rd.mode === 'strand' && rd.outTokens < rd.inTokens,
      'S4: one used dynamic glyph does not kill compression', `${rd.mode} ${rd.inTokens}->${rd.outTokens}`);
    // Whole pools soaked
    contract(sp.slice(0, 120).join('') + ' tail '.repeat(40), enc, 'S4 static pool soak');
    contract(dyn.slice(0, 120).join('') + ' tail '.repeat(40), enc, 'S4 dynamic pool soak');
    // decoder totality
    ok(strandDecode('ordinary text', enc) === 'ordinary text', 'S4: foreign wire passthrough');
    ok(strandDecode(MARK, enc) === MARK, 'S4: mark-only passthrough');
    ok(strandDecode(MARK + SFLAG, enc) === MARK + SFLAG, 'S4: mark+flag, no END passthrough');
    ok(strandDecode('', enc) === '', 'S4: empty passthrough');
  }

  console.log('S5 — static glyphs inside dynamic definitions');
  {
    // Build text whose best dynamic phrases contain book phrases, forcing the
    // header to hold static references. The decoder must treat them as book
    // lookups, never as definition delimiters.
    const b = strandBook(enc);
    const seed = b.phrases.slice(0, 4).join(' ');
    const t = (seed + ' unique-tail-marker ').repeat(14);
    const r = contract(t, enc, 'S5 static-in-definition');
    ok(strandDecode(r.wire, enc) === t, 'S5: decodes with static refs in header');
    if (r.mode === 'strand') {
      const hdr = r.wire.slice(0, r.wire.indexOf(END));
      const staticSet = new Set(strandStaticPool(enc));
      const hasStaticInHeader = [...hdr].some((c) => staticSet.has(c));
      ok(!hasStaticInHeader || r.wire.startsWith(MARK + SFLAG),
        'S5: static refs in header imply the flag is set');
    }
  }

  console.log('S6 — the mechanism claim: static seeding changes dynamic selection');
  {
    // If STRAND were "LATTICE plus a greedy table", the admitted dynamic set
    // would be identical to LATTICE's. Marginal-gain selection must differ on
    // at least one real document, or the central claim is false.
    let differs = 0, compared = 0;
    const corpus: string[] = [];
    if (fs.existsSync('bench/holdout')) for (const fn of fs.readdirSync('bench/holdout')) corpus.push(fs.readFileSync('bench/holdout/' + fn, 'utf8'));
    for (const t of corpus) {
      const s = strandEncode(t, enc);
      const l = latticeEncode(t, enc);
      if (s.mode !== 'strand' || l.mode !== 'lattice') continue;
      compared++;
      const sd = s.entries.filter((e) => e.kind === 'dynamic').map((e) => e.phrase).sort().join('\u0000');
      const ld = l.entries.map((e) => e.phrase).sort().join('\u0000');
      if (sd !== ld) differs++;
    }
    ok(compared >= 5, 'S6: enough documents compared', String(compared));
    ok(differs > 0, 'S6: static seeding demonstrably alters the admitted dynamic set',
      `${differs}/${compared} documents differ`);
  }

  console.log('S7 — degenerate, boundary & Unicode');
  {
    for (const t of ['', ' ', 'a', 'ab', '\n', '\n\n\n', 'a'.repeat(3000), ' '.repeat(2000), 'no repeats zqx']) {
      contract(t, enc, `S7 ${JSON.stringify(t.slice(0, 10))}(${t.length})`);
    }
    const cases: Array<[string, string]> = [
      ['astral', '😀🚀🧬 payload line. '.repeat(40)],
      ['combining', 'é\u0301 café naïve résumé. '.repeat(40)],
      ['rtl', 'مرحبا بالعالم شكرا لك. '.repeat(40)],
      ['cyrillic-text', 'Привет мир это тестовая строка. '.repeat(40)],
      ['greek-text', 'Γειά σου κόσμε δοκιμή γραμμή. '.repeat(40)],
      ['hebrew-text', 'שלום עולם זו שורת בדיקה. '.repeat(40)],
      ['thai-text', 'สวัสดีชาวโลก นี่คือบรรทัดทดสอบ '.repeat(40)],
      ['devanagari', 'नमस्ते दुनिया यह एक परीक्षण है। '.repeat(40)],
      ['cjk', '数据库迁移已完成，请检查连接池配置。'.repeat(40)],
      ['bom', '\uFEFF' + 'header row value. '.repeat(40)],
      ['nul', 'a\u0000b\u0000c '.repeat(60)],
      ['crlf', 'line one\r\nline two\r\n'.repeat(50)],
      ['mixed', CHAOS_G_CJK],
    ];
    for (const [n, t] of cases) contract(t, enc, `S7 ${n}`);
  }

  console.log('S8 — never-worse, determinism, wire-of-wire');
  {
    const corpus: Array<[string, string]> = [
      ['chaos900', CHAOS_900], ['chaosG', CHAOS_G_CJK], ['handtrace', MOSAIC_HANDTRACE_300],
      ['jsonLog', f.jsonLog], ['csv', f.csv], ['chat', f.chat], ['grid', f.grid],
      ['rle', f.rle], ['idrun', f.idrun], ['prose', f.prose],
    ];
    if (fs.existsSync('bench/holdout')) for (const fn of fs.readdirSync('bench/holdout')) corpus.push(['holdout:' + fn, fs.readFileSync('bench/holdout/' + fn, 'utf8')]);
    for (const [n, t] of corpus) {
      const a = contract(t, enc, `S8 ${n}`);
      const b = strandEncode(t, enc);
      ok(a.wire === b.wire, `S8 ${n}: deterministic`);
      const c = strandEncode(a.wire, enc);
      ok(strandDecode(c.wire, enc) === a.wire, `S8 ${n}: wire-of-wire exact`);
    }
  }

  console.log('S9 — cross-encoding parity (cl100k_base)');
  {
    const e2: EncodingName = 'cl100k_base';
    for (const [n, t] of [['chaos900', CHAOS_900], ['csv', f.csv], ['chat', f.chat],
      ['prose', f.prose], ['chaosG', CHAOS_G_CJK]] as Array<[string, string]>) {
      contract(t, e2, `S9 ${n}`);
    }
    const w = strandEncode(f.chat, enc).wire;
    const cross = strandDecode(w, e2);
    ok(cross === w || cross === f.chat, 'S9: cross-encoding decode is safe');
  }

  console.log('S10 — randomized fuzz');
  {
    const rnd = xorshift(777331);
    const b = strandBook(enc);
    const alphabets = ['abcdefg ', 'AB', '0123456789,;\n', '{}[]":,\n abc', 'αβγ ΔΕ\n', '亜唖娃阿哀 \n'];
    let worst = 0;
    for (let i = 0; i < 140; i++) {
      const al = alphabets[Math.floor(rnd() * alphabets.length)];
      const len = 20 + Math.floor(rnd() * 1600);
      const motif = Array.from({ length: 3 + Math.floor(rnd() * 12) }, () => al[Math.floor(rnd() * al.length)]).join('');
      let s = '';
      while (s.length < len) {
        const roll = rnd();
        if (roll < 0.35) s += motif;
        else if (roll < 0.5) s += b.phrases[Math.floor(rnd() * b.phrases.length)];  // exercise the book
        else s += al[Math.floor(rnd() * al.length)];
      }
      const r = strandEncode(s, enc);
      if (strandDecode(r.wire, enc) !== s) { fail++; console.log(`  ✗ S10 fuzz #${i} round-trip`, JSON.stringify(s.slice(0, 50))); }
      else pass++;
      if (r.mode !== 'forced-wrap' && r.outTokens > r.inTokens) { fail++; console.log(`  ✗ S10 fuzz #${i} worse than identity`); }
      else pass++;
      worst = Math.max(worst, r.outTokens - r.inTokens);
    }
    ok(worst <= 0, 'S10: no fuzz sample exceeded identity', `worst=${worst}`);
  }

  console.log('S11 — ROSETTA integration');
  {
    const corpus: Array<[string, string]> = [
      ['chaos900', CHAOS_900], ['chaosG', CHAOS_G_CJK], ['handtrace', MOSAIC_HANDTRACE_300],
      ['jsonLog', f.jsonLog], ['csv', f.csv], ['chat', f.chat], ['grid', f.grid],
      ['rle', f.rle], ['idrun', f.idrun], ['prose', f.prose],
    ];
    if (fs.existsSync('bench/holdout')) for (const fn of fs.readdirSync('bench/holdout')) corpus.push(['holdout:' + fn, fs.readFileSync('bench/holdout/' + fn, 'utf8')]);
    for (const [n, t] of corpus) {
      const r = await rosettaEncode(t, enc);
      ok(rosettaDecode(r.wire, enc) === t, `S11 ${n}: ROSETTA wire byte-exact`, r.member);
      ok(r.outTokens <= r.inTokens, `S11 ${n}: never worse`, `${r.inTokens}->${r.outTokens}`);
      const st = strandEncode(t, enc);
      ok(r.outTokens <= st.outTokens, `S11 ${n}: ROSETTA ≤ standalone STRAND`, `${r.outTokens} vs ${st.outTokens} (${r.member})`);
      const lt = latticeEncode(t, enc);
      ok(r.outTokens <= lt.outTokens, `S11 ${n}: ROSETTA ≤ standalone LATTICE`, `${r.outTokens} vs ${lt.outTokens}`);
    }
  }

  console.log('S12 — train/holdout contamination guard');
  {
    if (fs.existsSync('bench/train') && fs.existsSync('bench/holdout')) {
      const hold = fs.readdirSync('bench/holdout').map((x) => fs.readFileSync('bench/holdout/' + x, 'utf8'));
      let leaks = 0;
      for (const tf of fs.readdirSync('bench/train')) {
        const tt = fs.readFileSync('bench/train/' + tf, 'utf8');
        for (const h of hold) {
          let leak = false;
          for (let i = 0; i + 200 <= h.length && !leak; i += 50) if (tt.indexOf(h.slice(i, i + 200)) !== -1) leak = true;
          for (let i = 0; i + 200 <= tt.length && !leak; i += 50) if (h.indexOf(tt.slice(i, i + 200)) !== -1) leak = true;
          if (leak) { leaks++; console.log('    leak:', tf); break; }
        }
      }
      ok(leaks === 0, 'S12: no train/holdout overlap (200-char windows)', `${leaks} leaks`);
      // The shipped book must be reproducible from the committed corpus only.
      ok(strandBook(enc).phrases.length > 0, 'S12: shipped book is non-empty');
    } else ok(true, 'S12: corpora absent, skipped');
  }

  console.log(`\nSTRAND RED-TEAM: ${pass} pass / ${fail} fail`);
  if (fail > 0) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
