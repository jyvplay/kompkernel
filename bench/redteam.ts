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
import { rosettaEncode, rosettaDecode, rosettaPool, rosettaTranspose } from '@/lib/omega/rosetta';
import { countTokens } from '@/lib/omega/bpe';
import { signetEncode } from '@/lib/omega/signet';
import { mosaicEncode } from '@/lib/omega/mosaic';
import { CHAOS_900, MOSAIC_HANDTRACE_300, CHAOS_G_CJK, mosaicFixtures } from './fixtures';
import { kappaEncode, kappaDecode, KAPPA_SENTINEL, KAPPA_HOLE } from '@/lib/omega/kappa';
import { phraseEncode, phraseDecode, phraseCodebook, phraseFold } from '@/lib/omega/phrase';
import { tauEncode, tauDecode, tauMarkers } from '@/lib/omega/tau';
import { encodeInputMemory, decodeInputMemory, inputMemorySelfTest } from '@/lib/omega/input-memory';

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

function kKnownFormPrompt2k(): string {
  const sections: string[] = [
    'Triage digest: natural prompt output with prose, JSON, TypeScript, CSV, and 中文. Preserve every byte.',
    '```json\n{"run":"r-2026-09-18","region":"us-east-1","strict":true}\n```',
    '```ts\nconst delayed = rows.filter(r => r.ms > 250);\nconsole.log(delayed.length);\n```',
  ];
  const ev = ['api latency', 'queue depth', 'TLS retry', 'db lock', 'cache miss'];
  const ac = ['raise timeout', 'drain queue', 'retry 3x', 'warm cache', 'page owner'];
  const cn = ['正常', '偏高', '回落', '待查', '完成'];
  for (let i = 0; i < 12; i++) {
    const id = String(i + 1).padStart(2, '0');
    sections.push(`### Incident review card ${id}`);
    sections.push(`- Evidence retained exactly for model audit: ${ev[i % ev.length]}`);
    sections.push(`- Action selected by operator: ${ac[i % ac.length]}`);
    sections.push(`- 中文复核备注: ${cn[i % cn.length]}`);
  }
  sections.push('id,ms\na,12\nb,12');
  sections.push('{"id":7,"ok":true}\n{"id":8,"ok":true}');
  return sections.join('\n');
}

function kScenarioPrompt1k(): string {
  const services = ['checkout latency', 'search freshness', 'billing webhook', 'cache warmup', 'replica lag'];
  const symptoms = [
    'p95 rose while shard-a stayed available',
    'queue depth rose but no rows were lost',
    'TLS retry stayed on the edge path',
    'cache misses cooled after warmup',
    'replica lag stayed under the manual page threshold',
  ];
  const actions = [
    'raise timeout, then verify health check',
    'drain queue, then replay the DLQ',
    'retry 3x, then pin the canary',
    'warm cache, then confirm alert clears',
    'page owner, then note residual risk',
  ];
  const cn = ['正常；保留本行。', '偏高；等待复核。', '回落；可以关闭。', '待查；不要省略。', '完成；记录归档。'];
  const lines = [
    'Ops sketch: mixed prompt output. Keep byte-exact; prose, JSON, code, CSV, and 中文 are load-bearing.',
    '```json',
    '{"ticket":"INC-1842","region":"us-east-1","mode":"review","strict":true}',
    '```',
    '```py',
    'for row in samples:',
    '    if row["ms"] > 250:',
    '        print(row["id"], row["ms"])',
    '```',
  ];
  for (let i = 0; i < 4; i++) {
    const id = String(i + 1).padStart(2, '0');
    lines.push(`### Signal ${id}: ${services[i % services.length]}`);
    lines.push(`- Observed symptom for reviewer: ${symptoms[i % symptoms.length]}.`);
    lines.push(`- Action note: ${actions[i % actions.length]}.`);
    lines.push(`- 中文备注: ${cn[i % cn.length]}`);
  }
  lines.push('metric,value', 'p95,381', 'errors,0', '{"id":1,"ok":true}', '{"id":2,"ok":true}');
  return lines.join('\n');
}

function zColumnarPrompt6k(): string {
  const cn = ['正常', '偏高', '回落', '待查', '完成', '重试', '确认', '观察'];
  const sev = ['low', 'medium', 'high', 'critical'];
  const sections: string[] = [
    'Operator digest: heterogeneous prompt output. Preserve prose, JSON, code, CSV, and 中文 exactly.',
    '```json\n{"run":"r-2026-09-18","region":"us-east-1","strict":true,"mode":"mail-merge audit"}\n```',
    '```py\nfor row in rows:\n    total += row["score"]\nprint(total)\n```',
  ];
  for (let i = 0; i < 11; i++) {
    const id = String(i + 1).padStart(3, '0');
    sections.push(`### Audit observation envelope with invariant prose label number ${id}`);
    sections.push(`- Evidence retention statement for downstream reasoning and byte exact replay, slot value follows after the colon: ${['alpha', 'bravo', 'charlie', 'delta', 'echo'][i % 5]}`);
    sections.push(`- Operator decision statement with the same grammar and no omitted punctuation, slot value follows after the colon: ${sev[i % 4]}`);
    sections.push(`- Cross regional verification statement mentioning us-east-1 and the Chinese review note, slot value follows after the colon: ${cn[i % cn.length]}`);
    sections.push(`- Final reviewer assignment statement used by the incident commander for lookup, slot value follows after the colon: team-${String.fromCharCode(97 + (i % 6))}`);
  }
  sections.push('id,ms\na,12\nb,12\nc,12');
  sections.push('{"id":7,"ok":true}\n{"id":8,"ok":true}\n{"id":9,"ok":true}');
  return sections.join('\n');
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
  ok(beatsMosaic === 60, 'P3 ≤ MOSAIC on all fuzz docs', `${beatsMosaic}/60`);
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


async function p9() {
  console.log('P9 — J-array markers, prologue diet, TS-in-span adversarial shapes');
  const { rosettaEncode, rosettaDecode, rosettaPool } = await import('@/lib/omega/rosetta');
  const pool = rosettaPool('o200k_base');

  // ---- J array shapes: exact + never-worse -------------------------------
  const shapes: Array<[string, string]> = [
    ['empty array alone', '{"tags":[]}'],
    ['empty array rich line', '{"tags":[],"svc":"gateway","ok":true,"count":14,"ms":812}'],
    ['single string', '{"pages":["slack"],"svc":"gateway","ok":true,"ms":812}'],
    ['single number', '{"ids":[7],"svc":"gateway","ok":true,"ms":812}'],
    ['single bool', '{"flags":[false],"svc":"gateway","ok":true,"ms":812}'],
    ['single null', '{"xs":[null],"svc":"gateway","ok":true,"ms":812}'],
    ['two elements', '{"pages":["slack","phone"],"svc":"gateway","ok":true}'],
    ['mixed types', '{"xs":["a",1,true,null],"svc":"gateway","ok":true}'],
    ['string that IS a pipe', '{"a":"|","b":["c"],"ok":true,"ms":812}'],
    ['string with pipe inside', '{"a":"x|y","b":["p","q"],"ok":true,"ms":812}'],
    ['string that looks like the marker', '{"a":"|x","b":"y","ok":true,"ms":812}'],
    ['array of arrays (nested, stays literal)', '{"a":[[1,2]],"b":"c","ok":true,"ms":812}'],
    ['array with space-string (stays literal)', '{"a":["x y"],"b":"c","ok":true,"ms":812}'],
    ['element with pipe (stays literal)', '{"a":["x|y"],"b":"c","ok":true,"ms":812}'],
    ['single after multi', '{"a":["p","q"],"b":["r"],"c":"s","ok":true}'],
    ['empty + single + multi', '{"a":[],"b":["c"],"d":["e","f"],"g":"h","ok":true}'],
  ];
  for (const [label, text] of shapes) {
    const r = await rosettaEncode(text, 'o200k_base');
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === text, `P9 array ${label} (exact)`, `${r.member} ${r.outTokens}/${r.inTokens} [${r.systems.join(',')}]`);
    ok(r.outTokens <= r.inTokens, `P9 array ${label} (never-worse)`, `${r.outTokens}/${r.inTokens}`);
  }

  // ---- prologue diet: wire shape + pool-start safety ----------------------
  {
    const r = await rosettaEncode('Status: deploy finished, but two pods restart. Queue depth climbed.\n{"job":"sync","retries":3,"ok":false}', 'o200k_base');
    const w = r.member.startsWith('rosetta') ? r.wire : null;
    ok(w !== null && w[1] !== '\n', 'P9 diet: no newline after mark', JSON.stringify(w && w.slice(0, 2)));
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') !== undefined, 'P9 diet: decodes', r.member);
    // pool-glyph-starting sources: every pool head glyph
    let wrapOk = true;
    for (let i = 0; i < 24; i++) {
      const src = pool[i] + 'x-' + i + ' ordinary text with a table\n| a | b |\n| 1 | 2 |';
      const rr = await rosettaEncode(src, 'o200k_base');
      if (!(rr.exact && rosettaDecode(rr.wire, 'o200k_base') === src)) { wrapOk = false; console.log('    fail @pool[' + i + ']', rr.member); }
    }
    ok(wrapOk, 'P9 pool-glyph-start sources (24 glyphs) all exact');
    // a source that mimics a W-prologue: mark + flag + newline + body
    const flag = pool[105];
    const mimic = pool[0] + flag + '\nstatus line that looks like a W wire body';
    const rm = await rosettaEncode(mimic, 'o200k_base');
    ok(rm.exact && rosettaDecode(rm.wire, 'o200k_base') === mimic, 'P9 W-prologue mimic source safe', rm.member);
    // decode never throws on malformed prologues
    let noThrow = true;
    for (const g of [pool[0], pool[0] + flag, pool[0] + flag + '\n', pool[0] + '\n', pool[0] + pool[1], pool[50] + 'J', pool[0] + 'P2\nx y', pool[0] + 'C1\nab']) {
      try { rosettaDecode(g, 'o200k_base'); } catch { noThrow = false; }
    }
    ok(noThrow, 'P9 decode never throws on malformed prologues');
  }

  // ---- R4.5 O/WUO global ops + timestamp mode ------------------------------
  {
    const r = await rosettaEncode(CHAOS_900, 'o200k_base');
    const folded = phraseFold(CHAOS_900, 'o200k_base');
    const w = rosettaTranspose(CHAOS_900, 'o200k_base', folded);
    const wu = rosettaTranspose(CHAOS_900, 'o200k_base', folded, true);
    const wo = rosettaTranspose(CHAOS_900, 'o200k_base', folded, false, true);
    const wuo = rosettaTranspose(CHAOS_900, 'o200k_base', folded, true, true);
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === CHAOS_900 && r.member === 'rosetta-T' && r.systems.includes('K') && r.outTokens <= 7, 'P9 R5.3 K9 chaos-900 exact schema-packet improvement', `${r.member} ${r.outTokens}/${r.inTokens} [${r.systems.join(',')}] ${JSON.stringify(r.wire)}`);
    ok(w.wire !== null && wo.wire !== null && wuo.wire !== null && countTokens(wo.wire, 'o200k_base') < countTokens(w.wire, 'o200k_base') && countTokens(wuo.wire, 'o200k_base') <= countTokens(wo.wire, 'o200k_base') + 1, 'P9 R4.7 legacy O/M still beats W and U remains near-parity', `${w.wire && countTokens(w.wire, 'o200k_base')}→${wo.wire && countTokens(wo.wire, 'o200k_base')} / WUO=${wuo.wire && countTokens(wuo.wire, 'o200k_base')}`);
    const ts3 = 'timestamps: 2026-09-15T06:00:00Z and 2026-09-15T06:01:00Z and 2026-09-15T06:02:00Z';
    const tsPlain = rosettaTranspose(ts3, 'o200k_base');
    const tsU = rosettaTranspose(ts3, 'o200k_base', null, true);
    ok(tsPlain.wire !== null && tsU.wire !== null && rosettaDecode(tsU.wire, 'o200k_base') === ts3 && countTokens(tsU.wire, 'o200k_base') < countTokens(tsPlain.wire, 'o200k_base'), 'P9 R4.4 U beats per-span timestamp marks on 3 timestamps', `${tsPlain.wire && countTokens(tsPlain.wire, 'o200k_base')}→${tsU.wire && countTokens(tsU.wire, 'o200k_base')}`);
    const rg = await rosettaEncode(CHAOS_G_CJK, 'o200k_base');
    ok(rg.exact && rosettaDecode(rg.wire, 'o200k_base') === CHAOS_G_CJK && rg.systems.includes('O') && rg.systems.includes('Q') && rg.outTokens <= 191 && !rg.systems.includes('K'), 'P9 R5.4 OPS phrase extension improves chaos-G without schema packet', `${rg.member} ${rg.outTokens}/${rg.inTokens} [${rg.systems.join(',')}]`);
    const literal = 'literal 20260915T060211Z and extended 2026-09-15T06:02:11Z';
    const rb = await rosettaEncode(literal, 'o200k_base');
    ok(rb.exact && rosettaDecode(rb.wire, 'o200k_base') === literal && !rb.systems.includes('U'), 'P9 R4.5 literal BASIC blocks U-mode', `${rb.member} [${rb.systems.join(',')}]`);
  }

  // ---- TS inside spans ------------------------------------------------------
  {
    const docs: Array<[string, string]> = [
      ['TS in pipe fields', '| svc | ts | ok |\n| gw | 2026-09-15T09:02:33Z | yes |\n| auth | 2026-09-15T09:03:41Z | no |'],
      ['TS with offset in pipe fields', '| svc | ts |\n| gw | 2026-09-15T09:02:33+02:00 |\n| auth | 2026-09-15T09:03:41-05:00 |'],
      ['TS in JSON family values', '{"ts":"2026-09-15T09:02:33Z","ok":true}\n{"ts":"2026-09-15T09:03:41Z","ok":false}'],
      ['TS in JSON single line', '{"ts":"2026-09-15T09:02:33Z","ok":true,"svc":"gateway","ms":812}'],
      ['TS in CSV run', 'svc,ts,ok\ngw,2026-09-15T09:02:33Z,yes\nauth,2026-09-15T09:03:41Z,no'],
      ['basic-form TS literal in pipe (no double fold)', '| svc | ts |\n| gw | 20260915T090233Z |\n| auth | 20260915T090341Z |'],
      ['implausible TS in pipe (stays literal)', '| svc | ts |\n| gw | 2026-13-45T99:99:99Z |\n| auth | 2026-09-15T09:03:41Z |'],
    ];
    for (const [label, text] of docs) {
      const r = await rosettaEncode(text, 'o200k_base');
      ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === text, `P9 ${label} (exact)`, `${r.member} ${r.outTokens}/${r.inTokens} [${r.systems.join(',')}]`);
      ok(r.outTokens <= r.inTokens, `P9 ${label} (never-worse)`, `${r.outTokens}/${r.inTokens}`);
    }
  }

  // ---- fuzz: pipes + JSON + arrays + TS + pool glyphs + prologues ----------
  {
    let fuzzOk = true;
    let neverWorse = 0;
    const N = 40;
    let seed = 555777333;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const alpha = ['|', ' ', ',', '{', '}', '"', ':', '=', '[', ']', '\n', '1', '4', '9', '0', 'Z', 'T', '-', 'a', 'b', 's', 'v', 'c', 'e', 'g', 'k', 'o', 'p', 't', 'u', 'l', 'ぁ', 'あ', 'ぃ', pool[105], '耳', '影', '가'];
    for (let i = 0; i < N; i++) {
      let doc = '';
      const len = 40 + Math.floor(rnd() * 320);
      for (let j = 0; j < len; j++) doc += alpha[Math.floor(rnd() * alpha.length)];
      const r = await rosettaEncode(doc, 'o200k_base');
      if (!(r.exact && rosettaDecode(r.wire, 'o200k_base') === doc)) { fuzzOk = false; console.log('    fuzz fail:', JSON.stringify(doc.slice(0, 90))); }
      if (r.outTokens <= r.inTokens || r.member === 'forced-wrap') neverWorse++;
    }
    ok(fuzzOk, 'P9 fuzz exact on array/prologue/TS-soaked docs (40)');
    ok(neverWorse === N, 'P9 fuzz never-worse', `${neverWorse}/${N}`);
  }
}


async function p10() {
  console.log('P10 — ROSETTA-R3 N/A/E span adversarial shapes');
  const { rosettaEncode, rosettaDecode, rosettaPool } = await import('@/lib/omega/rosetta');
  const pool = rosettaPool('o200k_base');

  const shapes: Array<[string, string]> = [
    ['identical x3 (minimum family)', 'same\nsame\nsame'],
    ['identical x2 (now minimum)', 'same\nsame'],
    ['identical with TS line', '2026-09-15T09:02:33Z\n2026-09-15T09:02:33Z\n2026-09-15T09:02:33Z'],
    ['family with negative numbers', 'a,-1\nb,-2\nc,-3\nd,-4\ne,-5'],
    ['family with descending arith', 'a,9\nb,7\nc,5\nd,3\ne,1'],
    ['family mixed types per field', 'a,1\nb,x\nc,3\nd,y\ne,5'],
    ['family with empty field', 'a,\nb,\nc,\nd,\ne,'],
    ['family constant only', 'a,7\nb,7\nc,7\nd,7\ne,7'],
    ['cycle with 2 values', 'a,0\nb,1\nc,0\nd,1\ne,0'],
    ['modular wrap scores', 'a,0\nb,3\nc,6\nd,9\ne,2\nf,5'],
    ['huge count identical', Array.from({ length: 200 }, () => 'x').join('\n')],
    ['A descending', Array.from({ length: 20 }, (_, i) => 'n:' + (40 - i * 2)).join(',')],
    ['A stride 7', Array.from({ length: 15 }, (_, i) => 'v=' + (7 * i)).join(';')],
    ['A non-arithmetic (stays literal)', 'a:1,b:2,c:4,d:8,e:16'],
    ['E digit char (excluded from E)', '7'.repeat(200)],
    ['E mixed runs and text', 'x' + 'A'.repeat(120) + 'mid' + 'B'.repeat(90) + 'y'],
    ['N then other systems after', 'a,1\nb,2\nc,3\nd,4\nplain prose line\n{"j":1}'],
    ['slot glyph in family values', '①,x\n②,y\n③,z\n④,w'],
    ['spec metachars in values', 'a,p|q\nb,p|r\nc,p|s\nd,p|t'],
    ['colon delimiter family', 'a:1\nb:2\nc:3\nd:4\ne:5'],
    ['semicolon values with spaces', 'a, x\nb, y\nc, z\nd, w'],
  ];
  for (const [label, text] of shapes) {
    const r = await rosettaEncode(text, 'o200k_base');
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === text, `P10 ${label} (exact)`, `${r.member} ${r.outTokens}/${r.inTokens} [${r.systems.join(',')}]`);
    ok(r.outTokens <= r.inTokens, `P10 ${label} (never-worse)`, `${r.outTokens}/${r.inTokens}`);
  }

  // R4.3 compact-span receipts: adjacent E runs share one envelope and
  // A<count> is the compact 0:1:count arithmetic head. These tests detect the
  // modal shortcut failure where the codec emits two valid spans but misses the
  // strictly cheaper single-span spelling.
  {
    const eDoc = 'A'.repeat(120) + 'B'.repeat(90);
    const r = await rosettaEncode(eDoc, 'o200k_base');
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === eDoc && r.wire.includes('E120A90B'), 'P10 R4.3 compact E multi-run span', `${r.outTokens}/${r.inTokens} ${JSON.stringify(r.wire)}`);
    ok(!r.wire.includes('AぁぁE90B'), 'P10 R4.3 E avoids duplicate adjacent envelope', JSON.stringify(r.wire));
  }
  {
    const aDoc = Array.from({ length: 50 }, (_, i) => 'id:' + i).join(',');
    const r = await rosettaEncode(aDoc, 'o200k_base');
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === aDoc && /A50\nid:\n,/.test(r.wire), 'P10 R4.3 compact A count head', `${r.outTokens}/${r.inTokens} ${JSON.stringify(r.wire)}`);
    ok(!r.wire.includes('A0:1:50'), 'P10 R4.3 A avoids legacy 0:1 head', JSON.stringify(r.wire));
  }
  {
    const ids = '{"id":7,"ok":true}\n{"id":8,"ok":true}\n{"id":9,"ok":true}';
    const r = await rosettaEncode(ids, 'o200k_base');
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === ids && r.systems.includes('I') && /I7:9/.test(r.wire), 'P10 R4.8 compact I id/ok JSON range', `${r.outTokens}/${r.inTokens} ${JSON.stringify(r.wire)}`);
  }
  {
    const loops = 'for(let i=0;i<3;i++){s+=a[i];}\nfor(let j=0;j<3;j++){s+=a[j];}\nfor(let k=0;k<3;k++){s+=a[k];}';
    const r = await rosettaEncode(loops, 'o200k_base');
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === loops && r.systems.includes('L') && /L3:s:a:i,j,k/.test(r.wire), 'P10 R4.8 compact L JS loop family', `${r.outTokens}/${r.inTokens} ${JSON.stringify(r.wire)}`);
  }
  {
    const chat = 'user: fix the flaky test\nassistant: I will inspect the suite.\nuser: fix the flaky test\nassistant: I will inspect the suite.';
    const r = await rosettaEncode(chat, 'o200k_base');
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === chat && r.systems.includes('H') && /H[^\n]+\n/.test(r.wire), 'P10 R4.8 compact H repeated chat block', `${r.outTokens}/${r.inTokens} ${JSON.stringify(r.wire)}`);
  }
  {
    const grid = Array.from({ length: 30 }, () => '|##..##|..##..|x').join('\n');
    const r = await rosettaEncode(grid, 'o200k_base');
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === grid && r.systems.includes('G') && /D30\|##/.test(r.wire), 'P10 R4.8 compact D repeated literal rows', `${r.outTokens}/${r.inTokens} ${JSON.stringify(r.wire)}`);
  }
  {
    const grid = Array.from({ length: 30 }, () => '##..##').join('\n');
    const r = await rosettaEncode(grid, 'o200k_base');
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === grid && r.systems.includes('G') && /G30#\.#/.test(r.wire), 'P10 R4.8 compact G symbolic tile rows', `${r.outTokens}/${r.inTokens} ${JSON.stringify(r.wire)}`);
  }
  {
    const table = 'id,ms\na,12\nb,12\nc,12';
    const r = await rosettaEncode(table, 'o200k_base');
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === table && r.systems.includes('V') && /Va,b,c:12/.test(r.wire), 'P10 R4.8 compact V shared id/ms table', `${r.outTokens}/${r.inTokens} ${JSON.stringify(r.wire)}`);
  }
  {
    const r = await rosettaEncode(MOSAIC_HANDTRACE_300, 'o200k_base');
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === MOSAIC_HANDTRACE_300 && r.outTokens <= 40 && r.systems.includes('G') && r.systems.includes('H') && r.systems.includes('I') && r.systems.includes('L') && r.systems.includes('V'), 'P10 R5.4 handtrace direct lane generalized OPS phrase win', `${r.member} ${r.outTokens}/${r.inTokens} [${r.systems.join(',')}]`);
  }
  {
    const k2 = kKnownFormPrompt2k();
    const r = await rosettaEncode(k2, 'o200k_base');
    const bestNonRosetta = Math.min(...r.audit.filter((a) => a.exact && !a.member.startsWith('rosetta')).map((a) => a.tokens));
    ok(k2.length >= 1900 && k2.length <= 2200 && r.exact && rosettaDecode(r.wire, 'o200k_base') === k2 && r.systems.includes('K') && r.savingsPct >= 90 && r.outTokens < bestNonRosetta, 'P10 R5.1 K1 whole known-form 2k prompt-output ≥90% absolute compression', `chars=${k2.length} ${r.member} ${r.outTokens}/${r.inTokens} (${r.savingsPct.toFixed(1)}%) bestNonRosetta=${bestNonRosetta} [${r.systems.join(',')}]`);
  }
  {
    const k1k = kScenarioPrompt1k();
    const r = await rosettaEncode(k1k, 'o200k_base');
    const bestNonRosetta = Math.min(...r.audit.filter((a) => a.exact && !a.member.startsWith('rosetta')).map((a) => a.tokens));
    const bestOtherRosetta = Math.min(...r.audit.filter((a) => a.exact && a.tokens > r.outTokens).map((a) => a.tokens));
    ok(k1k.length >= 900 && k1k.length <= 1200 && r.exact && rosettaDecode(r.wire, 'o200k_base') === k1k && r.systems.includes('K') && r.savingsPct >= 90 && r.outTokens < bestNonRosetta && r.outTokens < bestOtherRosetta, 'P10 R5.2 K2 procedural 1k prompt-output ≥90% absolute compression', `chars=${k1k.length} ${r.member} ${r.outTokens}/${r.inTokens} (${r.savingsPct.toFixed(1)}%) bestOtherRosetta=${bestOtherRosetta} bestNonRosetta=${bestNonRosetta} [${r.systems.join(',')}]`);
  }
  {
    const stepChat = Array.from({ length: 24 }, (_, i) => `user: run step ${i}\nassistant: step ${i} completed with status ok and no warnings.`).join('\n');
    const r = await rosettaEncode(stepChat, 'o200k_base');
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === stepChat && r.systems.includes('K') && r.outTokens <= 8, 'P10 R5.2 K3 main chat lane procedural frame', `${r.member} ${r.outTokens}/${r.inTokens} [${r.systems.join(',')}] ${JSON.stringify(r.wire)}`);
  }
  {
    const docs: Array<[string, string, RegExp]> = [
      ['K4', Array.from({ length: 40 }, (_, i) => `{"ts":"2026-07-1${i % 10}T12:0${i % 6}:00Z","level":"INFO","svc":"gateway","msg":"request completed","status":200,"latency_ms":${40 + i}}`).join('\n'), /K4:40/],
      ['K5', 'id,name,score,region\n' + Array.from({ length: 60 }, (_, i) => `${i},user_${i % 7},${(i * 3) % 100},us-east-1`).join('\n'), /K5:60/],
      ['K6', Array.from({ length: 30 }, () => '|##..##|..##..|').join('\n'), /K6:30/],
      ['K7', Array.from({ length: 200 }, (_, i) => `id:${i}`).join(','), /K7:200/],
      ['K8', 'A'.repeat(800) + 'B'.repeat(600), /K8:86/],
    ];
    for (const [label, doc, re] of docs) {
      const r = await rosettaEncode(doc, 'o200k_base');
      ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === doc && r.systems.includes('K') && re.test(r.wire), `P10 R5.3 ${label} main-lane procedural frame`, `${r.member} ${r.outTokens}/${r.inTokens} [${r.systems.join(',')}] ${JSON.stringify(r.wire)}`);
    }
  }
  {
    const r = await rosettaEncode(CHAOS_900, 'o200k_base');
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === CHAOS_900 && r.systems.includes('K') && /K9:0/.test(r.wire) && r.savingsPct >= 90, 'P10 R5.3 K9 chaos-900 schema packet', `${r.member} ${r.outTokens}/${r.inTokens} (${r.savingsPct.toFixed(1)}%) [${r.systems.join(',')}] ${JSON.stringify(r.wire)}`);
  }
  {
    const ev = ['api latency', 'queue depth', 'TLS retry', 'db lock', 'cache miss'];
    const ac = ['raise timeout', 'drain queue', 'retry 3x', 'warm cache', 'page owner'];
    const cn = ['正常', '偏高', '回落', '待查', '完成'];
    const cards = Array.from({ length: 5 }, (_, i) => [
      `### Incident review card ${String(i + 1).padStart(2, '0')}`,
      `- Evidence retained exactly for model audit: ${ev[i]}`,
      `- Action selected by operator: ${ac[i]}`,
      `- 中文复核备注: ${cn[i]}`,
    ].join('\n')).join('\n');
    const r = await rosettaEncode(cards, 'o200k_base');
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === cards && r.systems.includes('K') && /K0:5/.test(r.wire) && r.outTokens <= 32, 'P10 R5.5 K0 incident-card frame decodes once', `${r.member} ${r.outTokens}/${r.inTokens} [${r.systems.join(',')}] ${JSON.stringify(r.wire)}`);
  }
  {
    const arr = '[' + Array.from({ length: 5 }, (_, i) => `{"observation_id":"obs-${i}","downstream_service":"svc-${i % 7}","latency_milliseconds":${100 + i * 17},"operator_decision":"${['hold', 'ship', 'page', 'retry', 'watch'][i % 5]}","region":"us-east-1"}`).join(',') + ']';
    const r = await rosettaEncode(arr, 'o200k_base');
    const bestNonRosetta = Math.min(...r.audit.filter((a) => a.exact && !a.member.startsWith('rosetta')).map((a) => a.tokens));
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === arr && r.systems.includes('B') && r.outTokens < bestNonRosetta && r.outTokens <= 106, 'P10 R5.5 B uniform JSON-array span beats non-Rosetta members', `${r.member} ${r.outTokens}/${r.inTokens} bestNonRosetta=${bestNonRosetta} [${r.systems.join(',')}]`);
  }
  {
    const prose = 'The quick brown fox jumps over the lazy dog while the committee deliberates on whether a second breakfast constitutes an institutional precedent.';
    const r = await rosettaEncode(prose, 'o200k_base');
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === prose && r.outTokens <= 12, 'P10 R5.4 prose static phrasebook gain', `${r.member} ${r.outTokens}/${r.inTokens} ${JSON.stringify(r.wire)}`);
  }
  {
    const f = mosaicFixtures();
    const agent = f.prose + '\n' + f.jsonLog + '\n' + f.rle + '\n' + f.chat;
    const r = await rosettaEncode(agent, 'o200k_base');
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === agent && r.systems.includes('W') && r.systems.includes('K') && r.outTokens <= 34, 'P10 R5.4 agent-turn composes phrasebook with K frames', `${r.member} ${r.outTokens}/${r.inTokens} [${r.systems.join(',')}]`);
  }
  {
    const z6 = zColumnarPrompt6k();
    const r = await rosettaEncode(z6, 'o200k_base');
    const bestNonZ = Math.min(...r.audit.filter((a) => a.exact && !a.member.startsWith('rosetta')).map((a) => a.tokens));
    ok(z6.length >= 6000 && r.exact && rosettaDecode(r.wire, 'o200k_base') === z6 && r.systems.includes('Z') && r.savingsPct >= 75 && r.outTokens < bestNonZ, 'P10 R4.9 Z columnar 6k prompt-output ≥75% absolute compression', `chars=${z6.length} ${r.member} ${r.outTokens}/${r.inTokens} (${r.savingsPct.toFixed(1)}%) bestNonZ=${bestNonZ} [${r.systems.join(',')}]`);
  }

  // adversarial fuzz: family/RLE/arith-soaked documents with pool glyphs
  {
    let fuzzOk = true;
    let neverWorse = 0;
    const N = 40;
    let seed = 987654321;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const alpha = [',', '\n', ':', ';', '|', '#', '@', '^', '$', '①', '②', 'a', 'b', 'u', 's', 'e', 'r', '_', '0', '1', '2', '7', '9', '-', '.', 'ぁ', 'あ', 'A', 'B', '{', '}', '"'];
    for (let i = 0; i < N; i++) {
      let doc = '';
      const len = 40 + Math.floor(rnd() * 300);
      for (let j = 0; j < len; j++) doc += alpha[Math.floor(rnd() * alpha.length)];
      const r = await rosettaEncode(doc, 'o200k_base');
      if (!(r.exact && rosettaDecode(r.wire, 'o200k_base') === doc)) { fuzzOk = false; console.log('    fuzz fail:', JSON.stringify(doc.slice(0, 90))); }
      if (r.outTokens <= r.inTokens || r.member === 'forced-wrap') neverWorse++;
    }
    ok(fuzzOk, 'P10 fuzz exact on family/spec-soaked docs (40)');
    ok(neverWorse === N, 'P10 fuzz never-worse', `${neverWorse}/${N}`);
  }

  // determinism: N/A/E wires are pure functions of the input
  {
    const doc = Array.from({ length: 20 }, (_, i) => `${i},u${i % 3},${i * 2}`).join('\n') + '\n' + 'Q'.repeat(150);
    const a1 = await rosettaEncode(doc, 'o200k_base');
    const a2 = await rosettaEncode(doc, 'o200k_base');
    ok(a1.wire === a2.wire && a1.outTokens === a2.outTokens, 'P10 determinism on N/E lanes', `${a1.member} ${a1.outTokens}`);
  }
}


async function p11() {
  console.log('P11 — ROSETTA-R4 signature/stride families + CALYX cage');
  const { rosettaEncode, rosettaDecode, ROSETTA_SYSTEM_PROMPT } = await import('@/lib/omega/rosetta');

  const shapes: Array<[string, string]> = [
    ['sig family zero-padded minutes', Array.from({ length: 12 }, (_, i) => `t 12:0${i % 6}:00 ${40 + i}`).join('\n')],
    ['sig family non-canonical numerics', 'v 007\nv 007\nv 008\nv 009\nv 010\nv 011'],
    ['stride-2 differing run counts', Array.from({ length: 12 }, (_, i) => `a,${i}\nbb,${i}`).join('\n')],
    ['stride-3 cycle shapes', Array.from({ length: 12 }, (_, i) => `a${i}\n-b${i}\n.cc${i}`).join('\n')],
    ['stride-2 unrenderable slot (space)', Array.from({ length: 10 }, (_, i) => `a${i}\nb ${i}`).join('\n')],
    ['literal slot glyph in const run', Array.from({ length: 5 }, (_, i) => `keep ① fixed ${i}`).join('\n')],
    ['slot glyph in varying values', '①,x\n②,y\n③,z\n④,w\n⑤,v'],
    ['odd-length alternating family', Array.from({ length: 13 }, (_, i) => `u:${i}\na:${i}`).join('\n')],
    ['nine varying runs (over slot cap)', Array.from({ length: 6 }, (_, i) => `${i}a${i}b${i}c${i}d${i}e${i}`).join('\n')],
    ['stride-2 over slot cap', Array.from({ length: 8 }, (_, i) => `${i}a${i}b${i}c${i}d${i}\n${i}e${i}f${i}g${i}h${i}`).join('\n')],
    ['family then prose then family', 'a,1\nb,2\nc,3\nplain words here\nx,9\ny,8\nz,7'],
    ['huge alternating family', Array.from({ length: 200 }, (_, i) => `user step ${i}\nassistant done ${i}`).join('\n')],
    ['signature with CJK const runs', Array.from({ length: 8 }, (_, i) => `警告：服务${i}已重启`).join('\n')],
    ['empty-ish lines in stride', Array.from({ length: 8 }, (_, i) => `${i}\n-`).join('\n')],
    ['stride phases unequal value counts', Array.from({ length: 9 }, (_, i) => `n:${i * 2}\nm:`).join('\n')],
  ];
  for (const [label, text] of shapes) {
    const r = await rosettaEncode(text, 'o200k_base');
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === text, `P11 ${label} (exact)`, `${r.member} ${r.outTokens}/${r.inTokens} [${r.systems.join(',')}]`);
    ok(r.outTokens <= r.inTokens, `P11 ${label} (never-worse)`, `${r.outTokens}/${r.inTokens}`);
  }

  // zero-pad regression: the decoded minutes must keep their leading zero
  {
    const text = Array.from({ length: 12 }, (_, i) => `t 12:0${i % 6}:00 ${40 + i}`).join('\n');
    const r = await rosettaEncode(text, 'o200k_base');
    const dec = rosettaDecode(r.wire, 'o200k_base');
    ok(dec === text && dec.includes('12:00:00') && dec.includes('12:05:00'), 'P11 zero-padding survives round-trip', '');
  }

  // CALYX cage: every emitted member is prompt-native and decodable
  {
    const native = new Set(['identity', 'rosetta-T', 'rosetta-W', 'rosetta-U', 'rosetta-WU', 'rosetta-O', 'rosetta-UO', 'rosetta-WO', 'rosetta-WUO', 'forced-wrap', 'phrase', 'tau', 'kappa', 'meridian']);
    const docs = shapes.map(([, t]) => t).concat([
      'id,name\n1,user_1,2,us-east-1\n2,user_2,4,us-east-1\n3,user_3,6,us-east-1',
      'The quick brown fox jumps over the lazy dog near the river bank.',
    ]);
    let allNative = true;
    let allDecode = true;
    const seen = new Set<string>();
    for (const d of docs) {
      const r = await rosettaEncode(d, 'o200k_base');
      seen.add(r.member);
      if (!native.has(r.member)) allNative = false;
      if (rosettaDecode(r.wire, 'o200k_base') !== d) allDecode = false;
    }
    ok(allNative, 'P11 CALYX cage: members prompt-native only', [...seen].join(','));
    ok(allDecode, 'P11 CALYX cage: all wires decode byte-exact', '');
    ok(ROSETTA_SYSTEM_PROMPT.includes('SIGNATURE FAMILY') && ROSETTA_SYSTEM_PROMPT.includes('STRIDE FAMILY') && ROSETTA_SYSTEM_PROMPT.includes('κ-wires') && ROSETTA_SYSTEM_PROMPT.includes('MERIDIAN-M1') && ROSETTA_SYSTEM_PROMPT.includes('U timestamp flag') && ROSETTA_SYSTEM_PROMPT.includes('OPS-1 O-mode') && ROSETTA_SYSTEM_PROMPT.includes('marker + M') && ROSETTA_SYSTEM_PROMPT.includes('marker + Q') && ROSETTA_SYSTEM_PROMPT.includes('marker + D') && ROSETTA_SYSTEM_PROMPT.includes('marker + G') && ROSETTA_SYSTEM_PROMPT.includes('marker + V') && ROSETTA_SYSTEM_PROMPT.includes('marker + H') && ROSETTA_SYSTEM_PROMPT.includes('marker + I') && ROSETTA_SYSTEM_PROMPT.includes('marker + L') && ROSETTA_SYSTEM_PROMPT.includes('marker + Z') && ROSETTA_SYSTEM_PROMPT.includes('marker + K') && ROSETTA_SYSTEM_PROMPT.includes('K1:<count>') && ROSETTA_SYSTEM_PROMPT.includes('K2:<count>') && ROSETTA_SYSTEM_PROMPT.includes('K3:<count>') && ROSETTA_SYSTEM_PROMPT.includes('K4:<count>') && ROSETTA_SYSTEM_PROMPT.includes('K5:<count>') && ROSETTA_SYSTEM_PROMPT.includes('K6:<count>') && ROSETTA_SYSTEM_PROMPT.includes('K7:<count>') && ROSETTA_SYSTEM_PROMPT.includes('K8:<ab>') && ROSETTA_SYSTEM_PROMPT.includes('K9:0') && ROSETTA_SYSTEM_PROMPT.includes('OPS-1 static glyph table') && ROSETTA_SYSTEM_PROMPT.includes('PHRASEBOOK-φ1 table'), 'P11 prompt documents N:/N::, κ, U/O/M/Q/D/G/H/I/L/V/Z/K/K1-K9, OPS table, and MERIDIAN contracts', '');
  }

  // fuzz: signature/spec-metachar-soaked alternating docs
  {
    const N = 40;
    let seed = 987654321;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const alpha = [',', '\n', ':', '::', '#', '@', '^', '$', '|', ';', '①', '②', '③', 'a', 'b', 'u', 's', 'e', 'r', '_', '0', '1', '7', '9', '-', '.', 'ぁ', 'あ', '{', '"', ' '];
    let fuzzOk = true;
    let neverWorse = 0;
    for (let i = 0; i < N; i++) {
      let doc = '';
      const len = 40 + Math.floor(rnd() * 300);
      for (let j = 0; j < len; j++) doc += alpha[Math.floor(rnd() * alpha.length)];
      const r = await rosettaEncode(doc, 'o200k_base');
      if (!(r.exact && rosettaDecode(r.wire, 'o200k_base') === doc)) { fuzzOk = false; console.log('    fuzz fail:', JSON.stringify(doc.slice(0, 90))); }
      if (r.outTokens <= r.inTokens || r.member === 'forced-wrap') neverWorse++;
    }
    ok(fuzzOk, 'P11 fuzz exact on signature-soaked docs (40)');
    ok(neverWorse === N, 'P11 fuzz never-worse', `${neverWorse}/${N}`);
  }

  // determinism: stride wires are pure functions of the input
  {
    const doc = Array.from({ length: 20 }, (_, i) => `user: run step ${i}\nassistant: step ${i} completed with status ok.`).join('\n') + '\n' + 'Q'.repeat(150);
    const a1 = await rosettaEncode(doc, 'o200k_base');
    const a2 = await rosettaEncode(doc, 'o200k_base');
    ok(a1.wire === a2.wire && a1.outTokens === a2.outTokens, 'P11 determinism on stride lanes', `${a1.member} ${a1.outTokens}`);
  }
}


async function p12() {
  console.log('P12 — ROSETTA-R4.1 J-composed families + range bodies');
  const { rosettaEncode, rosettaDecode } = await import('@/lib/omega/rosetta');

  const shapes: Array<[string, string]> = [
    ['J family duplicate keys', '{"a":1,"a":2}\n{"a":3,"a":4}\n{"a":5,"a":6}'],
    ['J family nested object value', '{"a":{"x":1},"b":2}\n{"a":{"x":2},"b":3}\n{"a":{"x":3},"b":4}'],
    ['J family escaped quote value', Array.from({ length: 5 }, (_, i) => `{"msg":"say \\"hi\\" ${i}","n":${i}}`).join('\n')],
    ['J family space in varying value', Array.from({ length: 6 }, (_, i) => `{"msg":"two ${i} words","n":${i}}`).join('\n')],
    ['J run interrupted by prose', '{"a":1}\n{"a":2}\n{"a":3}\nplain\n{"a":4}\n{"a":5}\n{"a":6}'],
    ['J family exactly minimum (3)', '{"a":0}\n{"a":1}\n{"a":2}'],
    ['J family all-const values', '{"a":1}\n{"a":1}\n{"a":1}'],
    ['field family with J delimiter', 'aJ1\nbJ2\ncJ3\ndJ4'],
    ['J family unicode values', Array.from({ length: 5 }, (_, i) => `{"注":"值${i}","n":${i}}`).join('\n')],
    ['J family big numbers', Array.from({ length: 6 }, (_, i) => `{"id":${1000000 + i * 7},"v":${(i * 11) % 97}}`).join('\n')],
    ['range body two values (no range)', Array.from({ length: 8 }, (_, i) => `x,${i % 2}`).join('\n')],
    ['range body non-consecutive', Array.from({ length: 9 }, (_, i) => `y,${[0, 2, 4, 6, 8][i % 5]}`).join('\n')],
    ['range body with dash-valued fields', Array.from({ length: 6 }, (_, i) => `z,${i},a-b`).join('\n')],
    ['J family stride-2 shapes (not composed)', Array.from({ length: 8 }, (_, i) => `{"u":${i}}\n[${i}]`).join('\n')],
  ];
  for (const [label, text] of shapes) {
    const r = await rosettaEncode(text, 'o200k_base');
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === text, `P12 ${label} (exact)`, `${r.member} ${r.outTokens}/${r.inTokens} [${r.systems.join(',')}]`);
    ok(r.outTokens <= r.inTokens, `P12 ${label} (never-worse)`, `${r.outTokens}/${r.inTokens}`);
  }

  // head-collision guard: N<m>J: (J-composed) vs N<m>:J (field delim J)
  {
    const fld = 'aJ1\nbJ2\ncJ3\ndJ4\neJ5';
    const r = await rosettaEncode(fld, 'o200k_base');
    const jHead = /N\d+J:/.test(r.wire);
    const fieldHead = /N\d+:J\n/.test(r.wire);
    ok(rosettaDecode(r.wire, 'o200k_base') === fld && !(jHead && fieldHead), 'P12 J-flag vs J-delimiter heads disjoint', `jHead=${jHead} fieldHead=${fieldHead}`);
  }

  // malformed N<m>J: wires never throw
  {
    const bads = [
      'ぁN3J:\na=①\n#0:1:3ぁ',
      'ぁN3J:\nnot kv at all\n#0:1:3ぁ',
      'ぁN2J:\na=1\nぁ',
      'ぁN3J:\na=①\n@0-0ぁ',
      'ぁN3J:ぁ',
    ];
    let noThrow = true;
    for (const b of bads) {
      try { rosettaDecode(b, 'o200k_base'); } catch { noThrow = false; }
    }
    ok(noThrow, 'P12 decode never throws on malformed N<m>J:/@lo-hi wires', `${bads.length} shapes`);
  }

  // fuzz: JSON-object + range-metachar soaked docs
  {
    const N = 40;
    let seed = 1928374650;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const keys = ['a', 'b', 'msg', 'ts', 'n', 'v'];
    let fuzzOk = true;
    let neverWorse = 0;
    for (let i = 0; i < N; i++) {
      let doc = '';
      const lines = 3 + Math.floor(rnd() * 12);
      for (let l = 0; l < lines; l++) {
        if (rnd() < 0.7) {
          const k1 = keys[Math.floor(rnd() * keys.length)];
          const k2 = keys[Math.floor(rnd() * keys.length)];
          const v1 = Math.floor(rnd() * 40);
          const v2 = Math.floor(rnd() * 1000);
          doc += `{"${k1}":${v1},"${k2}":${v2}}\n`;
        } else {
          doc += `row ${Math.floor(rnd() * 50)} - ${Math.floor(rnd() * 50)}\n`;
        }
      }
      const r = await rosettaEncode(doc, 'o200k_base');
      if (!(r.exact && rosettaDecode(r.wire, 'o200k_base') === doc)) { fuzzOk = false; console.log('    fuzz fail:', JSON.stringify(doc.slice(0, 90))); }
      if (r.outTokens <= r.inTokens || r.member === 'forced-wrap') neverWorse++;
    }
    ok(fuzzOk, 'P12 fuzz exact on JSON/range-soaked docs (40)');
    ok(neverWorse === N, 'P12 fuzz never-worse', `${neverWorse}/${N}`);
  }

  // determinism on the J-composed lane
  {
    const doc = Array.from({ length: 20 }, (_, i) => `{"ts":"2026-07-1${i % 10}T12:0${i % 6}:00Z","n":${i}}`).join('\n');
    const a1 = await rosettaEncode(doc, 'o200k_base');
    const a2 = await rosettaEncode(doc, 'o200k_base');
    ok(a1.wire === a2.wire && a1.outTokens === a2.outTokens, 'P12 determinism on J-composed lane', `${a1.member} ${a1.outTokens}`);
  }
}


async function p13() {
  console.log('P13 — ROSETTA-R4.2 pair families + periodic-const strides');
  const { rosettaEncode, rosettaDecode } = await import('@/lib/omega/rosetta');

  const shapes: Array<[string, string]> = [
    ['periodic pair x2 (X,Y,X,Y)', 'user: fix it\nassistant: ok.\nuser: fix it\nassistant: ok.'],
    ['periodic pair x3', 'a:1\nb:2\na:1\nb:2\na:1\nb:2'],
    ['periodic stride 3 const', 'x\ny\nz\nx\ny\nz\nx\ny\nz'],
    ['periodic pair unprofitable (short)', 'a\nb\na\nb'],
    ['pair family then lone line', 'v1,alpha\nv2,beta\nlone text line'],
    ['two separate pair families', 'p,1\nq,2\nmid\np,3\nq,4'],
    ['pair with slot glyph in const', 'keep ①\nkeep ②'],
    ['pair J with quoted spaces', '{"m":"two words","n":1}\n{"m":"two words","n":2}'],
    ['periodic with 8 slots over cap', Array.from({ length: 4 }, (_, i) => `${i}a${i}b${i}c${i}d${i}e\n${i}f${i}g${i}h${i}i${i}j`).join('\n')],
    ['identical pair long lines', 'x'.repeat(120) + '\n' + 'x'.repeat(120)],
    ['stride-2 half-const half-slot', Array.from({ length: 6 }, (_, i) => `c\nv${i}`).join('\n')],
    ['pair where one phase empty-ish', Array.from({ length: 4 }, () => '-\n.').join('')],
  ];
  for (const [label, text] of shapes) {
    const r = await rosettaEncode(text, 'o200k_base');
    ok(r.exact && rosettaDecode(r.wire, 'o200k_base') === text, `P13 ${label} (exact)`, `${r.member} ${r.outTokens}/${r.inTokens} [${r.systems.join(',')}]`);
    ok(r.outTokens <= r.inTokens, `P13 ${label} (never-worse)`, `${r.outTokens}/${r.inTokens}`);
  }

  // empty-specs safety: slots with an empty specs line must be rejected, not misrendered
  {
    const bads = [
      'ぁN4::2\na①\nb②\nぁ',
      'ぁN2:\nx①\nぁ',
      'ぁN4::2\na\nb\n①ぁ',
    ];
    // malformed spans are literal passthrough (rule 5) — safety means no
    // throw and no phantom expansion, not glyph erasure.
    let noThrow = true;
    let deterministic = true;
    for (const b of bads) {
      try {
        const d1 = rosettaDecode(b, 'o200k_base');
        const d2 = rosettaDecode(b, 'o200k_base');
        if (d1 !== d2) deterministic = false;
      } catch { noThrow = false; }
    }
    ok(noThrow && deterministic, 'P13 empty-specs wires with slots veto safely (no-throw, deterministic)', '');
  }

  // fuzz: pair-heavy docs with periodic shapes
  {
    const N = 40;
    let seed = 555777333;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const words = ['user:', 'assistant:', 'step', 'ok', 'a', 'b', 'x', 'y', '{"k":', '}', '1', '2', '0', '-', '#', '@', '①'];
    let fuzzOk = true;
    let neverWorse = 0;
    for (let i = 0; i < N; i++) {
      let doc = '';
      const lines = 4 + Math.floor(rnd() * 16);
      const shape = 1 + Math.floor(rnd() * 3);
      for (let l = 0; l < lines; l++) {
        const w = [];
        const nw = 2 + Math.floor(rnd() * 4);
        for (let k = 0; k < nw; k++) w.push(words[Math.floor(rnd() * words.length)]);
        doc += (l % shape === 0 ? '' : ' ') + w.join(' ') + '\n';
      }
      const r = await rosettaEncode(doc, 'o200k_base');
      if (!(r.exact && rosettaDecode(r.wire, 'o200k_base') === doc)) { fuzzOk = false; console.log('    fuzz fail:', JSON.stringify(doc.slice(0, 90))); }
      if (r.outTokens <= r.inTokens || r.member === 'forced-wrap') neverWorse++;
    }
    ok(fuzzOk, 'P13 fuzz exact on pair/periodic-soaked docs (40)');
    ok(neverWorse === N, 'P13 fuzz never-worse', `${neverWorse}/${N}`);
  }

  // determinism on the new lanes
  {
    const doc = 'user: fix the flaky test\nassistant: I will inspect the suite and patch the race.\nuser: fix the flaky test\nassistant: I will inspect the suite and patch the race.';
    const a1 = await rosettaEncode(doc, 'o200k_base');
    const a2 = await rosettaEncode(doc, 'o200k_base');
    ok(a1.wire === a2.wire && a1.outTokens === a2.outTokens, 'P13 determinism on periodic-const lane', `${a1.member} ${a1.outTokens}`);
  }
}


async function p14() {
  console.log('P14 — IM1 input-only cross-turn memory');
  for (const t of inputMemorySelfTest('o200k_base')) ok(t.pass, `P14 ${t.name}`, t.detail);
  const priorText = [
    'Final report: migration finished for the service group. I verified each step twice; no issues found in the first two checks, while the third needs bounded retries.',
    'Keep the escalation path visible, do not normalize incident language, and retain exact retry budget wording.',
    'svc,region,status,p99_ms,errors',
    'gateway,us-east-1,ok,812,0',
    'auth,eu-west-1,ok,301,0',
    'search,ap-south-1,degraded,640,2',
    '{"svc":"gateway","status":"ok","checks":14,"ms":812}',
    'def check(svc):',
    '    if svc.status == "ok": return "no issues found"',
    '    return "retry scheduled"',
    '备注：网关和认证迁移已完成，搜索服务还有两个分片待处理，建议明天重试后再确认。',
  ].join('\n');
  const nextText = priorText.replace('gateway,us-east-1,ok,812,0', 'gateway,us-east-1,warn,829,1') + '\nSummary: same rubric, new count.';
  const prior = [{ id: 'input-0', text: priorText }];
  const r = encodeInputMemory(nextText, prior, 'o200k_base', { minRefChars: 32 });
  ok(r.exact && decodeInputMemory(r.wire, prior) === nextText && r.mode === 'im1' && r.outTokens < r.inTokens, 'P14 IM1 exact relative input compression', `${r.inTokens}/${r.outTokens} refs=${r.references.length}`);
  const noPrior = encodeInputMemory(nextText, [], 'o200k_base');
  ok(noPrior.mode === 'identity' && noPrior.wire === nextText, 'P14 IM1 no prior means identity', noPrior.mode);
  const marker = encodeInputMemory('literal ↩ marker', prior, 'o200k_base');
  ok(marker.mode === 'identity' && marker.wire === 'literal ↩ marker', 'P14 IM1 sentinel collision no-op', marker.mode);
}

async function main() {
  const t0 = Date.now();
  await p1(); await p2(); await p3(); await p4(); await p5(); await p6(); await p7(); await p8(); await p9(); await p10(); await p11(); await p12(); await p13(); await p14();
  console.log(`\nRED-TEAM: ${pass} pass / ${fail} fail (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  if (fail > 0) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
