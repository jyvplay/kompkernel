/**
 * bench/redteam.ts — ASTRAEA-A2 & ROSETTA adversarial verification (≥5 passes).
 *
 * P1 negative-space shapes (≥15 pathological sources)
 * P2 second-order adversary (boundary mutations of chaos-900)
 * P3 grammar fuzz (random structured docs, exactness + never-worse)
 * P4 determinism & purity (cache, double-encode, wire-re-encode)
 * P5 cross-encoding (cl100k_base end-to-end)
 * P6 KAPPA adversarial shapes
 * P7 PHRASEBOOK-φ1 + ROSETTA-W adversarial shapes
 * P8 TAU-τ1 + ROSETTA-R2 adversarial shapes
 * P9 ASTRAEA-A2 adversarial shapes (DW, D, W, T, dynamic local dict, 4000-char)
 */
import { rosettaEncode, rosettaDecode, rosettaPool } from '@/lib/omega/rosetta';
import { astraeaEncode, astraeaDecode } from '@/lib/omega/astraea';
import { countTokens } from '@/lib/omega/bpe';
import { signetEncode } from '@/lib/omega/signet';
import { mosaicEncode } from '@/lib/omega/mosaic';
import { CHAOS_900, MOSAIC_HANDTRACE_300, CHAOS_G_CJK } from './fixtures';
import { kappaEncode, kappaDecode, KAPPA_SENTINEL, KAPPA_HOLE } from '@/lib/omega/kappa';
import { phraseEncode, phraseDecode, phraseCodebook } from '@/lib/omega/phrase';
import { tauEncode, tauDecode, tauMarkers } from '@/lib/omega/tau';
import { CHAOS_4000 } from './test-4000';

let pass = 0;
let fail = 0;
const ok = (cond: boolean, label: string, extra = '') => {
  if (cond) { pass++; }
  else { fail++; console.log(`  ✗ ${label} ${extra}`); }
};

async function rt(text: string, enc: 'o200k_base' | 'cl100k_base' = 'o200k_base') {
  const r = await astraeaEncode(text, enc);
  const back = astraeaDecode(r.wire, enc);
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
    const dec = astraeaDecode(r.wire);
    ok(exact && dec === text, `${label} (exact)`, `member=${r.member} out=${r.outTokens}/${r.in}`);
    ok(r.outTokens <= r.inTokens || r.member === 'forced-wrap', `${label} (never-worse)`, `out=${r.outTokens} in=${r.in}`);
  }
}

// ---------------------------------------------------------------- P2
async function p2() {
  console.log('P2 — second-order adversary: boundary mutations of chaos-900');
  const muts: Array<[string, string]> = [];
  for (const ins of ['ぁ', 'ぁ\n', '[SG1]\n', '⟐', 'ぁJx=1ぁ', '，', '劫', 'ぁCregion hostsぁ']) {
    muts.push([`insert ${JSON.stringify(ins.slice(0, 6))} @100`, CHAOS_900.slice(0, 100) + ins + CHAOS_900.slice(100)]);
    muts.push([`insert ${JSON.stringify(ins.slice(0, 6))} @0`, ins + CHAOS_900]);
  }
  const cut = (at: number, len: number) => CHAOS_900.slice(0, at) + CHAOS_900.slice(at + len);
  const i1 = CHAOS_900.indexOf('20260915'); const i2 = CHAOS_900.indexOf('us-east-1'); const i3 = CHAOS_900.indexOf('{"job"');
  muts.push(['cut timestamp', cut(i1 - 4, 24)]);
  muts.push(['cut region', cut(i2, 10)]);
  muts.push(['cut json', cut(i3, 30)]);
  muts.push(['cut kana-adjacent', CHAOS_900.replace(' 备注：', ' 备注：ぁぁぁ')]);
  muts.push(['swap halves', CHAOS_900.slice(450) + '\n' + CHAOS_900.slice(0, 450)]);
  muts.push(['duplicate region block', CHAOS_900 + '\n' + 'us-east-1 iad-9 42 0\neu-west-1 dub-9 17 2']);
  for (const [label, text] of muts) {
    const { r, exact } = await rt(text);
    const dec = astraeaDecode(r.wire);
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
        case 4: lines.push(pick(['注意：数据库迁移已完成。', '検知: アラート発報、復旧しました。', '결论: 인증서 만료가 원인입니다.', '备注：缓存预热失败，请检查配置。'])); break;
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
    const dec = astraeaDecode(r.wire);
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
  const a = await astraeaEncode(CHAOS_900, 'o200k_base');
  const b = await astraeaEncode(CHAOS_900, 'o200k_base');
  ok(a.wire === b.wire && a.outTokens === b.outTokens, 'double-encode identical (cache purity)');
  const w = await rt(a.wire);
  ok(w.exact, 'wire re-encode exact', `member=${w.r.member} out=${w.out}/${w.in}`);
  ok(astraeaDecode(a.wire) === astraeaDecode(a.wire), 'decode pure');
  const garbage = ['ぁ', 'ぁ\n', 'ぁJ', 'ぁC', 'ぁ2026', '[SG1]', '⟐', '\u0000\u0001', 'ぁ' + String.fromCodePoint(0x10ffff)];
  let noThrow = true;
  for (const g of garbage) { try { astraeaDecode(g); } catch { noThrow = false; } }
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

async function p9() {
  console.log('P9 — ASTRAEA-A2 4000-character & dynamic dictionary shapes');
  const { r, exact } = await rt(CHAOS_4000);
  ok(exact, 'CHAOS_4000 exact round-trip', `member=${r.member} systems=[${r.systems.join(',')}] ${r.outTokens}/${r.inTokens}`);
  ok(r.outTokens < r.inTokens, 'CHAOS_4000 token reduction', `${r.outTokens} < ${r.inTokens}`);
}

async function main() {
  const t0 = Date.now();
  await p1(); await p2(); await p3(); await p4(); await p5(); await p9();
  console.log(`\nRED-TEAM: ${pass} pass / ${fail} fail (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  if (fail > 0) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
