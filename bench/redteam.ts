/**
 * bench/redteam.ts — ROSETTA adversarial verification (≥5 passes).
 *
 * P1 negative-space shapes (≥15 pathological sources)
 * P2 second-order adversary (boundary mutations of chaos-900)
 * P3 grammar fuzz (random structured docs, exactness + never-worse)
 * P4 determinism & purity (cache, double-encode, wire-re-encode)
 * P5 cross-encoding (cl100k_base end-to-end)
 * P7 PHRASEBOOK-φ1 + ROSETTA-W adversarial shapes
 * P8 TAU-τ1 + ROSETTA-R2 adversarial shapes
 */
import { rosettaEncode, rosettaDecode, rosettaPool } from '@/lib/omega/rosetta';
import { countTokens } from '@/lib/omega/bpe';
import { signetEncode } from '@/lib/omega/signet';
import { mosaicEncode } from '@/lib/omega/mosaic';
import { CHAOS_900, MOSAIC_HANDTRACE_300, CHAOS_G_CJK } from './fixtures';
import { kappaEncode, kappaDecode, KAPPA_SENTINEL, KAPPA_HOLE } from '@/lib/omega/kappa';
import { phraseEncode, phraseDecode, phraseCodebook } from '@/lib/omega/phrase';
import { tauEncode, tauDecode, tauMarkers } from '@/lib/omega/tau';

let pass = 0;
let fail = 0;
const ok = (cond: boolean, label: string, extra = '') => {
  if (cond) { pass++; }
  else { fail++; console.log(`  ✗ ${label} ${extra}`); }
};

async function rt(text: string, enc: 'o200k_base' | 'cl100k_base' = 'o200k_base') {
  const r = await rosettaEncode(text, enc);
  const back = rosettaDecode(r.wire, enc);
  return { r, exact: r.exact && back === text && r.decoded === text, out: r.outTokens, in: r.inTokens };
}

// ---------------------------------------------------------------- P1
async function p1() {
  console.log('P1 — negative-space shapes');
  const pool = rosettaPool('o200k_base');
  const sentinels = ['[MZ1]\n', '[SG1]\n', '[P1]\n', '[M1]\n', '⟨QSR⟩\n', '[PX]\n', '[[VX1\n', '[AX1]\n',
    '[TS1]\n', '[ST1]\n', '[RP1]\n', '[TR1]\n', '[CL1]\n', '[SP1]\n', '[⌘STENCIL]', '[Ϻ]'];
  const shapes: Array<[string, string]> = [
    ['empty', ''],
    ['single char', 'x'],
    ['only newlines', '\n\n\n\n'],
    ['mark+newline source (forced wrap)', pool[0] + '\nsome source line\n'],
    ['helix glyph inline', 'deploy ⟐ finished\n'],
    ['crlf everywhere', 'a,b\r\n1,2\r\n2026-09-15T06:00:00Z\r\n'],
    ['astral + zwj', '👩‍👩‍👧‍👦 🏳️‍🌈 emoji\r\nfamilia 👨‍👩‍👦'],
    ['bom + zero-width', '﻿x​y﻿ z'],
    ['all kana in source', 'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろわをん' ],
    ['entire pool in source', pool.join('')],
    ['pseudo J span in source', 'line\nぁJjob=sync ok=trueぁ\nnext'],
    ['pseudo C span in source', 'ぁCregion hosts\niad 42ぁ'],
    ['quoted-comma CSV', 'name,note\nalice,"said, hi"\nbob,"a,b,c"'],
    ['unicode-escape JSON', '{"a":"\\u0041\\u00e9","b":2}'],
    ['long single line', 'x'.repeat(50_000) + ',y'],
    ['json array only', '["a","b","c"]'],
    ['tabs and vertical space', 'a\tb\vc\fd'],
    ['trailing newline variants', 'a,b\n1,2\n'],
    ['region mid-word', 'aus-east-1b zone'],
    ['timestamp zoo', '2026-09-15T06:00:00.123+02:00 2026-09-15T06:00:00Z 20260915T060000Z'],
  ];
  for (const s of sentinels) shapes.push([`sentinel source ${JSON.stringify(s.slice(0, 8))}`, s + 'payload line\n2026-09-15T06:00:00Z done']);
  for (const [label, text] of shapes) {
    const { r, exact } = await rt(text);
    const dec = rosettaDecode(r.wire);
    ok(exact && dec === text, `${label} (exact)`, `member=${r.member} out=${r.outTokens}/${r.in}`);
    ok(r.outTokens <= r.inTokens || r.member === 'forced-wrap', `${label} (never-worse)`, `out=${r.outTokens} in=${r.in}`);
  }
}

// ---------------------------------------------------------------- P2
async function p2() {
  console.log('P2 — second-order adversary: boundary mutations of chaos-900');
  const muts: Array<[string, string]> = [];
  // insertions at adversarial points
  for (const ins of ['ぁ', 'ぁ\n', '[SG1]\n', '⟐', 'ぁJx=1ぁ', '，', '劫', 'ぁCregion hostsぁ']) {
    muts.push([`insert ${JSON.stringify(ins.slice(0, 6))} @100`, CHAOS_900.slice(0, 100) + ins + CHAOS_900.slice(100)]);
    muts.push([`insert ${JSON.stringify(ins.slice(0, 6))} @0`, ins + CHAOS_900]);
  }
  // deletions at span boundaries (timestamps, regions, json)
  const cut = (at: number, len: number) => CHAOS_900.slice(0, at) + CHAOS_900.slice(at + len);
  const i1 = CHAOS_900.indexOf('20260915'); const i2 = CHAOS_900.indexOf('us-east-1'); const i3 = CHAOS_900.indexOf('{"job"');
  muts.push(['cut timestamp', cut(i1 - 4, 24)]);
  muts.push(['cut region', cut(i2, 10)]);
  muts.push(['cut json', cut(i3, 30)]);
  muts.push(['cut kana-adjacent', CHAOS_900.replace(' 备注：', ' 备注：ぁぁぁ')]);
  // swaps
  muts.push(['swap halves', CHAOS_900.slice(450) + '\n' + CHAOS_900.slice(0, 450)]);
  muts.push(['duplicate region block', CHAOS_900 + '\n' + 'us-east-1 iad-9 42 0\neu-west-1 dub-9 17 2']);
  for (const [label, text] of muts) {
    const { r, exact } = await rt(text);
    const dec = rosettaDecode(r.wire);
    ok(exact && dec === text, `${label} (exact)`, `member=${r.member}`);
    ok(r.outTokens <= r.inTokens || r.member === 'forced-wrap', `${label} (never-worse)`, `out=${r.outTokens} in=${r.in}`);
  }
}

// ---------------------------------------------------------------- P3
async function p3() {
  console.log('P3 — grammar fuzz: 60 random structured documents');
  let seed = 20260915;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const regions = ['us-east-1', 'eu-west-1', 'ap-south-1', 'ap-northeast-1', 'us-west-2'];
  const build = () => {
    const lines: string[] = [];
    const n = 4 + Math.floor(rnd() * 14);
    for (let i = 0; i < n; i++) {
      switch (Math.floor(rnd() * 8)) {
        case 0: lines.push(`2026-09-1${Math.floor(rnd() * 10)}T0${Math.floor(rnd() * 9)}:1${Math.floor(rnd() * 10)}:0${Math.floor(rnd() * 10)}Z ${pick(['INFO', 'WARN', 'ERROR'])} svc${i} ${pick(['ok', 'retry', 'timeout'])}`); break;
        case 1: lines.push(`${pick(regions)} host-${i} ${Math.floor(rnd() * 99)} ${Math.floor(rnd() * 9)}`); break;
        case 2: lines.push(`{"k${i}":"v${i}","n":${Math.floor(rnd() * 999)},"ok":${rnd() > 0.5}}`); break;
        case 3: lines.push(`${pick(['csv', 'svc', 'app'])},${pick(regions)},${Math.floor(rnd() * 99)},${Math.floor(rnd() * 999)}`); break;
        case 4: lines.push(pick(['注意：数据库迁移已完成。', '検知: アラート発報、復旧しました。', '결론: 인증서 만료가 원인입니다.', '备注：缓存预热失败，请检查配置。'])); break;
        case 5: lines.push(`  field_${i}: ${Math.floor(rnd() * 5000)}`); break;
        case 6: lines.push(pick(['run(ctx):', 'def f(x):', 'SELECT 1;', 'git push origin main', ''])); if (rnd() > 0.7) lines.push('    indented content here'); break;
        default: lines.push(pick(['Status: deploy finished, pods restarting.', 'Queue depth climbed during the window.', 'Next steps? Audit and rerun.', 'Watch the retry budget closely.']));
      }
    }
    return lines.join('\n');
  };
  let neverWorse = 0; let beatsSignet = 0; let beatsMosaic = 0;
  for (let d = 0; d < 60; d++) {
    const text = build();
    const { r, exact } = await rt(text);
    const dec = rosettaDecode(r.wire);
    ok(exact && dec === text, `fuzz doc ${d} exact`, `member=${r.member} len=${text.length}`);
    const sg = signetEncode(text, 'o200k_base').outTokens;
    const mo = mosaicEncode(text, 'o200k_base').outTokens;
    if (r.outTokens <= r.inTokens) neverWorse++;
    if (r.outTokens <= sg) beatsSignet++;
    if (r.outTokens <= mo) beatsMosaic++;
  }
  console.log(`  never-worse: ${neverWorse}/60 · ≤signet: ${beatsSignet}/60 · ≤mosaic: ${beatsMosaic}/60`);
  ok(neverWorse === 60, 'P3 never-worse on all fuzz docs');
}

// ---------------------------------------------------------------- P4
async function p4() {
  console.log('P4 — determinism & purity');
  const a = await rosettaEncode(CHAOS_900, 'o200k_base');
  const b = await rosettaEncode(CHAOS_900, 'o200k_base');
  ok(a.wire === b.wire && a.outTokens === b.outTokens, 'double-encode identical (cache purity)');
  // encode the WIRE itself — must decode to the wire, exactly
  const w = await rt(a.wire);
  ok(w.exact, 'wire re-encode exact', `member=${w.r.member} out=${w.out}/${w.in}`);
  // decode is pure: same input twice
  ok(rosettaDecode(a.wire) === rosettaDecode(a.wire), 'decode pure');
  // decode garbage must not throw
  const garbage = ['ぁ', 'ぁ\n', 'ぁJ', 'ぁC', 'ぁ2026', '[SG1]', '⟐', '\u0000\u0001', 'ぁ' + String.fromCodePoint(0x10ffff)];
  let noThrow = true;
  for (const g of garbage) { try { rosettaDecode(g); } catch { noThrow = false; } }
  ok(noThrow, 'decode never throws on garbage');
}

// ---------------------------------------------------------------- P5
async function p5() {
  console.log('P5 — cross-encoding (cl100k_base)');
  const { r, exact } = await rt(CHAOS_900, 'cl100k_base');
  ok(exact, 'chaos-900 exact on cl100k_base', `member=${r.member} ${r.outTokens}/${r.inTokens}`);
  const rivals = [signetEncode(CHAOS_900, 'cl100k_base').outTokens, mosaicEncode(CHAOS_900, 'cl100k_base').outTokens];
  ok(r.outTokens <= Math.min(...rivals, r.inTokens), 'cl100k never-worse', `out=${r.outTokens} rivals=${rivals}`);
  const jp = '概要: 決済サービスがエラーを返しました。\n- 原因: 接続プール枯渇\n2026-09-15T08:22:41Z WARN pool exhausted\n{"alert":"latency","ok":false,"ms":890}\nap-northeast-1 payment degraded 890\n次の対応: プール上限を引き上げます。';
  const jr = await rt(jp, 'cl100k_base');
  ok(jr.exact, 'japanese sample exact on cl100k_base', `member=${jr.r.member} ${jr.out}/${jr.in}`);
}

async function p6() {
  console.log('P6 — KAPPA adversarial shapes');
  const shapes: Array<[string, string]> = [
    ['empty', ''],
    ['single char', 'x'],
    ['hole marker in source', 'for(let ⋄=0;⋄<3;⋄++){s+=a[⋄];}\nfor(let ⋄=0;⋄<3;⋄++){s+=a[⋄];}'],
    ['κ sentinel source', KAPPA_SENTINEL + 'ぁ\nplain body with repeats repeats repeats repeats'],
    ['parameterized code pair', 'for(let i=0;i<3;i++){s+=a[i];}\nfor(let j=0;j<3;j++){s+=a[j];}'],
    ['json id pair', '{"id":7,"ok":true}\n{"id":8,"ok":true}'],
    ['three-way parameterized', 'case 1: return "one";\ncase 2: return "two";\ncase 3: return "three";'],
    ['exact repeat x6', 'no issues found\nno issues found\nno issues found\nno issues found\nno issues found\nno issues found'],
    ['overlapping repeats', 'abababababababababab ababab ababababab'],
    ['homoglyph fillers', 'value₁ = 10\nvalue₂ = 20\nvalue₃ = 30'],
    ['repeat across CRLF', 'line one\r\nline one\r\nline one'],
    ['chinese repeat', '备注：数据库迁移已完成。\n备注：数据库迁移已完成。\n备注：数据库迁移已完成。'],
    ['all-kana source (window pressure)', 'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよ'],
    ['handtrace-300 (regression)', MOSAIC_HANDTRACE_300],
    ['nested-looking def', 'ぁdef-ish text ぁ inline ㄙ glyph ㄙ text'],
    ['long single repeat', 'A'.repeat(400) + 'B'.repeat(400)],
  ];
  for (const [label, text] of shapes) {
    const r = kappaEncode(text, 'o200k_base');
    const back = kappaDecode(r.wire);
    const safety = r.notes.startsWith('forced header');
    ok(back === text && r.decoded === text && r.exact, `κ ${label} (exact)`, `out=${r.outTokens}/${r.inTokens} applied=${r.applied}`);
    ok(safety || r.outTokens <= r.inTokens, `κ ${label} (never-worse)`, `out=${r.outTokens} in=${r.inTokens}`);
  }
  // κ wire re-encode must decode back to the wire
  const w = kappaEncode(MOSAIC_HANDTRACE_300, 'o200k_base');
  const re = kappaEncode(w.wire, 'o200k_base');
  ok(kappaDecode(re.wire) === w.wire && re.exact, 'κ wire re-encode exact', `member note=${re.notes}`);
  // decode never throws on garbage
  let noThrow = true;
  for (const g of ['κ', 'κ\n', 'κ\nぁ', 'κ\nぁ\nぁぁぁい', 'κ\nぁ\nあdefあいargい', '♡', KAPPA_HOLE]) {
    try { kappaDecode(g); } catch { noThrow = false; }
  }
  ok(noThrow, 'κ decode never throws on garbage');
}


async function p7() {
  console.log('P7 — PHRASEBOOK-φ1 + ROSETTA-W adversarial shapes');
  const glyphs = [...phraseCodebook('o200k_base').byGlyph.keys()];
  const jp = '影響範囲はデータベースのタイムアウトです。対応: モニタリングとアラートの再起動をします。';
  const cn = '备注：连接池和负载均衡需要健康检查，必要时请检查配置，已完成版本回滚。';

  // ---- standalone φ shapes: exact + never-worse (safety lane exempt) -------
  const shapes: Array<[string, string]> = [
    ['empty', ''],
    ['single char', 'x'],
    ['φ sentinel source', 'φ\n' + jp],
    ['φφ literal sentinel source', 'φφ\n' + jp],
    ['φ without newline', 'φ is a greek letter, 影響範囲 not folded from here'],
    ['glyph-poisoned mid-text', 'before ' + glyphs[5] + ' after 影響範囲 phrase present'],
    ['glyph-poisoned + phrases', jp + '\nstray ' + glyphs[0] + ' glyph'],
    ['phrase-heavy jp', jp],
    ['phrase-heavy cn', cn],
    ['overlap chain', ' I will be there and the plan of the week will be noted.'],
    ['repeat x8', 'the root cause of the blast radius\n'.repeat(8)],
    ['phrase inside JSON', '{"msg":"影響範囲 and the タイムアウト of the run","code":404}'],
    ['phrase inside CSV field', 'note,impact\nrow1,影響範囲\nrow2,タイムアウト'],
    ['phrase adjacent to timestamp', 'at 2026-09-15T06:02:11Z the 影響範囲 was measured'],
    ['non-codebook hangul source', '한국어 텍스트가 여기에 있습니다 影響範囲 mixed'],
    ['chaos-G fixture', CHAOS_G_CJK],
    ['long phrase-dense', (jp + '\n' + cn + '\n').repeat(40)],
  ];
  for (const [label, text] of shapes) {
    const r = phraseEncode(text, 'o200k_base');
    const back = phraseDecode(r.wire, 'o200k_base');
    const safety = r.notes.startsWith('forced literal wrap');
    ok(back === text && r.decoded === text && r.exact, `φ ${label} (exact)`, `out=${r.outTokens}/${r.inTokens} applied=${r.applied}`);
    ok(safety || r.outTokens <= r.inTokens, `φ ${label} (never-worse)`, `out=${r.outTokens} in=${r.inTokens}`);
  }

  // glyph-poisoned must NOT fold (identity wire, decode-safe)
  {
    const poisoned = jp + ' ' + glyphs[3];
    const r = phraseEncode(poisoned, 'o200k_base');
    ok(!r.applied && r.wire === poisoned, 'φ poisoned source stays identity');
  }

  // φ wire re-encode: the wire starts with the φ sentinel → literal wrap path
  {
    const w = phraseEncode(CHAOS_G_CJK, 'o200k_base');
    const re = phraseEncode(w.wire, 'o200k_base');
    ok(re.exact && phraseDecode(re.wire, 'o200k_base') === w.wire, 'φ wire re-encode exact', `note=${re.notes}`);
  }

  // decode never throws on garbage
  {
    let noThrow = true;
    for (const g of ['φ', 'φ\n', 'φφ\n', 'φ\n' + glyphs[0], 'φφ\nφ\n' + glyphs[1] + glyphs[2], '♡', glyphs.slice(0, 30).join('')]) {
      try { phraseDecode(g, 'o200k_base'); } catch { noThrow = false; }
    }
    ok(noThrow, 'φ decode never throws on garbage');
  }

  // ---- ROSETTA-W shapes -----------------------------------------------------
  {
    const r = await rt(CHAOS_G_CJK);
    ok(r.exact, 'W chaos-G exact', `member=${r.r.member} ${r.out}/${r.in} systems=[${r.r.systems.join(',')}]`);
    ok(r.out < r.in, 'W chaos-G profitable', `${r.out} < ${r.in}`);
    const r2 = await rt(jp + '\n' + cn);
    ok(r2.exact, 'W jp+cn exact', `member=${r2.r.member} systems=[${r2.r.systems.join(',')}]`);
  }
  {
    // glyph-poisoned: W must be skipped entirely, wire still decodes
    const poisoned = CHAOS_G_CJK + '\nstray ' + glyphs[0] + ' glyph';
    const { r, exact } = await rt(poisoned);
    ok(exact && !r.systems.includes('W'), 'W skipped on glyph-poisoned source', `member=${r.member} systems=[${r.systems.join(',')}]`);
  }
  {
    // pseudo-W source: starts like a W wire (pool glyph, newline, flag-looking
    // glyph, newline) — G5 must force a safe wrap; round-trip byte-exact.
    const pool = rosettaPool('o200k_base');
    const pseudoW = pool[10] + '\n' + pool[10 + 1 + 103] + '\n' + jp + '\nplain tail';
    const { r, exact } = await rt(pseudoW);
    ok(exact, 'pseudo-W source exact (forced safe wrap)', `member=${r.member} ${r.out}/${r.in}`);
  }
  {
    // φ-sentinel source through ROSETTA: identity withheld, decode-safe
    const phiSource = 'φ\n' + jp;
    const { r, exact } = await rt(phiSource);
    ok(exact, 'φ-sentinel source through ROSETTA exact', `member=${r.member}`);
  }
  {
    // W wire re-encode: a W wire fed back through rosettaEncode round-trips
    const first = await rosettaEncode(CHAOS_G_CJK, 'o200k_base');
    const re = await rt(first.wire);
    ok(re.exact, 'W wire re-encode exact', `member=${re.r.member}`);
  }

  // adversarial fuzz incl. codebook glyphs + φ + kana + JSON/CSV structure
  {
    let fuzzOk = true;
    let neverWorse = 0;
    const N = 40;
    let seed = 987654321;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const alpha = ['a', 'b', ' ', '\n', ',', '"', '{', '}', '=', ':', '1', '9', 'φ', 'ぁ', 'あ', ...glyphs.slice(0, 8), '影', '響', '範', '囲', '校', '한', '글'];
    for (let i = 0; i < N; i++) {
      let doc = '';
      const len = 40 + Math.floor(rnd() * 300);
      for (let j = 0; j < len; j++) doc += alpha[Math.floor(rnd() * alpha.length)];
      const { r, exact, out, in: tin } = await rt(doc);
      if (!exact) { fuzzOk = false; console.log('    fuzz fail:', JSON.stringify(doc.slice(0, 80))); }
      if (out <= tin || r.member === 'forced-wrap') neverWorse++;
    }
    ok(fuzzOk, 'P7 fuzz exact on glyph/φ-soaked docs (40)');
    ok(neverWorse === N, 'P7 fuzz never-worse on glyph/φ-soaked docs', `${neverWorse}/${N}`);
  }
}


async function p8() {
  console.log('P8 — TAU-τ1 + ROSETTA-R2 adversarial shapes');
  const { mark, sep } = tauMarkers('o200k_base');

  // ---- standalone τ shapes: exact + never-worse (safety lane exempt) -------
  const shapes: Array<[string, string]> = [
    ['empty', ''],
    ['single char', 'x'],
    ['τ sentinel source', 'τ\n| a | b |\n| 1 | 2 |'],
    ['ττ literal sentinel source', 'ττ\n| a | b |\n| 1 | 2 |'],
    ['τ without newline', 'τ is a greek letter; | a | b |'],
    ['marker-poisoned', '| a | b |\n| 1 | 2 |\nstray ' + mark + ' glyph'],
    ['sep-poisoned', '```yaml\nserver:\n  port: 8080\n  replicas: 4\n```\nstray ' + sep],
    ['pipe basic', '| team | tickets | sla |\n| search | 14 | 97% |\n| infra | 8 | 99% |'],
    ['pipe field with pipe inside', '| a|b | c |\n| 1 | 2 |'],
    ['pipe single row (no fold)', '| a | b |'],
    ['pipe spaced fields (no fold)', '| team name | tickets |\n| search team | 14 |'],
    ['pipe field with digit-run', '| id | ts |\n| 42 | 2026 |\n| 43 | 2027 |'],
    ['yaml basic', '```yaml\nserver:\n  port: 8080\n  timeout_ms: 3000\n  replicas: 4\n```'],
    ['yaml value with = and spaces', '```yaml\napp:\n  cmd: run --flag=3 yes\n  zone: us-east-1\n```'],
    ['yaml bracket list', '```yaml\nserver:\n  regions: [us-east-1, eu-west-1]\n  timeout_ms: 3000\n```'],
    ['yaml single pair (no fold)', '```yaml\nserver:\n  port: 8080\n```'],
    ['yaml unclosed fence', '```yaml\nserver:\n  port: 8080'],
    ['comma basic', 'service,env,replicas\ningest,prod,6\nquery,prod,4'],
    ['comma with empty field (no fold)', 'a,b\n1,\n,3'],
    ['comma with spaces (no fold)', 'a,b c\n1,2'],
    ['json family via τ (none expected)', '{"a":1,"b":2}\n{"a":3,"b":4}'],
    ['mixed doc', '| a | b |\n| 1 | 2 |\nplain\nx,y\n1,2\n```yaml\ns:\n  p: 1\n  q: 2\n```'],
  ];
  for (const [label, text] of shapes) {
    const r = tauEncode(text, 'o200k_base');
    const back = tauDecode(r.wire, 'o200k_base');
    const safety = r.notes.startsWith('forced literal wrap');
    ok(back === text && r.decoded === text && r.exact, `τ ${label} (exact)`, `out=${r.outTokens}/${r.inTokens} systems=[${r.systems.join(',')}]`);
    ok(safety || r.outTokens <= r.inTokens, `τ ${label} (never-worse)`, `out=${r.outTokens} in=${r.inTokens}`);
  }

  // τ wire re-encode round-trips (τ-prefixed → wrap path)
  {
    const doc = '| team | tickets |\n| search | 14 |\n| infra | 8 |';
    const w = tauEncode(doc, 'o200k_base');
    const re = tauEncode(w.wire, 'o200k_base');
    ok(re.exact && tauDecode(re.wire, 'o200k_base') === w.wire, 'τ wire re-encode exact', `note=${re.notes}`);
  }

  // decode never throws on garbage
  {
    let noThrow = true;
    for (const g of ['τ', 'τ\n', 'ττ\n', 'τ\n' + mark + 'P', 'τ\n' + mark + 'P2\none row', 'τ\n' + mark + 'C3\na b\nc', 'τ\n' + mark + 'Y' + sep, 'τ\n' + mark + 'Q9\nx', mark, sep, 'τ\n' + mark + 'P0\nx y']) {
      try { tauDecode(g, 'o200k_base'); } catch { noThrow = false; }
    }
    ok(noThrow, 'τ decode never throws on garbage');
  }

  // ---- ROSETTA-R2 shapes -----------------------------------------------------
  {
    // chaos-E: P fires inside the transposition; round-trip + strict improvement
    const E = 'Weekly report: search quality dipped after the sharding change.\n- p95 latency 480ms (was 210ms)\n- 3 regression bugs filed by QA\n| team | tickets | sla |\n| search | 14 | 97% |\n| infra | 8 | 99% |\n| data | 5 | 91% |\n```yaml\nserver:\n  port: 8080\n  regions: [us-east-1, eu-west-1]\n  timeout_ms: 3000\n```\n{"build":"2841","passed":812,"failed":3,"skipped":17,"flaky":["search-7"]}\nNote: 日文团队报告索引重建将在周五完成，请确认窗口。\naudit 2026-09-15T09:02:33Z deploy finished in 42s\nFollow-ups: revert the sharding flag, re-run the suite, page data-oncall.';
    const r = await rt(E);
    ok(r.exact, 'R2 chaos-E exact', `member=${r.r.member} ${r.out}/${r.in} systems=[${r.r.systems.join(',')}]`);
    ok(r.out < 184, 'R2 chaos-E improves on R1 champion (184)', `${r.out}`);
    // F-system: same-schema JSON family
    const FJ = '{"svc":"gateway","status":"ok","checks":14,"ms":812}\n{"svc":"auth","status":"ok","checks":9,"ms":301}\n{"svc":"search","status":"warn","checks":7,"ms":640}';
    const rf = await rt(FJ);
    ok(rf.exact, 'R2 JSON family exact', `member=${rf.r.member} ${rf.out}/${rf.in} systems=[${rf.r.systems.join(',')}]`);
    ok(rf.out < rf.in, 'R2 JSON family profitable', `${rf.out} < ${rf.in}`);
    // JSON family adversaries: duplicate keys, spaced values, nested objects
    for (const [lbl, doc] of [
      ['dup keys', '{"a":1,"a":2}\n{"a":3,"a":4}'],
      ['spaced string value', '{"a":"x y"}\n{"a":"z w"}'],
      ['nested object', '{"a":{"b":1}}\n{"a":{"b":2}}'],
      ['mixed keys order', '{"a":1,"b":2}\n{"b":3,"a":4}'],
    ] as Array<[string, string]>) {
      const ra = await rt(doc);
      ok(ra.exact, `R2 JSON family adversary: ${lbl}`, `member=${ra.r.member} systems=[${ra.r.systems.join(',')}]`);
    }
    // pseudo-P source: a source line that looks like a rendered P span
    const pool = rosettaPool('o200k_base');
    const pseudoP = pool[0] + 'P' + 'team tickets sla\nsearch 14 97%\ntail line';
    const rp = await rt(pseudoP);
    ok(rp.exact, 'pseudo-P source exact (safe wrap)', `member=${rp.r.member} ${rp.out}/${rp.in}`);
    // pipe + W composition: phrases inside pipe fields
    const comp = '| svc | status | note |\n| gateway | ok | 影響範囲 checked |\n| auth | ok | タイムアウト none |\nFollow up during the window.';
    const rc2 = await rt(comp);
    ok(rc2.exact, 'P+W composition exact', `member=${rc2.r.member} systems=[${rc2.r.systems.join(',')}] ${rc2.out}/${rc2.in}`);
  }

  // adversarial fuzz incl. table/yaml/json structure + markers + φ/τ sentinels
  {
    let fuzzOk = true;
    let neverWorse = 0;
    const N = 40;
    let seed = 192837465;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const alpha = ['|', ' ', ',', '{', '}', '"', ':', '=', '[', ']', '\n', '`', 'y', 'a', 'm', 'l', '1', '4', '9', 'τ', 'φ', mark, sep, 'ぁ', '影', '響', '가', 'ㅌ', '-', '_'];
    for (let i = 0; i < N; i++) {
      let doc = '';
      const len = 40 + Math.floor(rnd() * 320);
      for (let j = 0; j < len; j++) doc += alpha[Math.floor(rnd() * alpha.length)];
      const { r, exact, out, in: tin } = await rt(doc);
      if (!exact) { fuzzOk = false; console.log('    fuzz fail:', JSON.stringify(doc.slice(0, 90))); }
      if (out <= tin || r.member === 'forced-wrap') neverWorse++;
      const tr = tauEncode(doc, 'o200k_base');
      if (!(tr.exact && tauDecode(tr.wire, 'o200k_base') === doc)) { fuzzOk = false; console.log('    τ fuzz fail:', JSON.stringify(doc.slice(0, 90))); }
    }
    ok(fuzzOk, 'P8 fuzz exact on table/marker/φ/τ-soaked docs (40)');
    ok(neverWorse === N, 'P8 fuzz never-worse on table/marker-soaked docs', `${neverWorse}/${N}`);
  }
}

async function main() {
  const t0 = Date.now();
  await p1(); await p2(); await p3(); await p4(); await p5(); await p6(); await p7(); await p8();
  console.log(`\nRED-TEAM: ${pass} pass / ${fail} fail (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  if (fail > 0) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
