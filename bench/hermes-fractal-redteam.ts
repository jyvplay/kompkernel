/**
 * Independent gates for HERMES-F.
 *
 * This bench intentionally does not use hermesFractalDecode for its primary
 * decode check.  The second decoder is a literal implementation of the prose
 * contract, so a shared bug in encoder and library decoder cannot certify the
 * wire.  The test also checks the honest one-chat metric M = prompt + wire,
 * exactness on hostile text, dynamic arity/width, all slot generators, and the
 * adaptive Pareto router against HERMES-Ω.
 */
import assert from 'node:assert';
import { countTokens } from '../src/lib/omega/bpe';
import {
  HERMES_F_START,
  hermesFractalEncode,
  hermesFractalDecode,
  hermesFractalDecoderPrompt,
  hermesAdaptiveEncode,
} from '../src/lib/omega/hermes-fractal';
import { hermesEncode } from '../src/lib/omega/hermes';
import { mosaicFixtures, CHAOS_F_LLM_REPORT, CHAOS_G_CJK, MOSAIC_HANDTRACE_300 } from './fixtures';

let passed = 0;
function ok(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve().then(fn).then(() => { passed++; console.log(`  ok  ${name}`); });
}

/** Independent prompt-literal decoder. It knows only the HERMES-F wire grammar
 * printed by hermesFractalDecoderPrompt, not the codec's implementation. */
function promptLiteralDecode(wire: string): string {
  const prefix = HERMES_F_START + '\n';
  if (!wire.startsWith(prefix)) return wire;
  const defs = new Map<number, { literals: string[]; specs: string[] }>();
  const out: string[] = [];
  const lines = wire.slice(prefix.length).split('\n');
  const spec = (s: string, n: number): string[] => {
    if (s.startsWith('=')) return Array(n).fill(JSON.parse(s.slice(1)));
    if (s.startsWith('#')) {
      const m = s.slice(1).match(/^(-?\d+),(-?\d+)$/); assert.ok(m);
      const a = Number(m![1]), d = Number(m![2]);
      return Array.from({ length: n }, (_, i) => String(a + i * d));
    }
    const v = JSON.parse(s.slice(1));
    assert.ok(Array.isArray(v));
    if (s.startsWith('%')) return Array.from({ length: n }, (_, i) => v[i % v.length]);
    assert.equal(v.length, n);
    return v;
  };
  for (const line of lines) {
    if (!line) continue;
    const p = line.split('\t');
    if (p[0] === 'T') {
      assert.equal(p.length, 4);
      const literals = JSON.parse(p[2]), specs = JSON.parse(p[3]);
      assert.equal(literals.length, specs.length + 1);
      defs.set(Number(p[1]), { literals, specs });
    } else if (p[0] === 'R') {
      assert.equal(p.length, 2); out.push(JSON.parse(p[1]));
    } else if (p[0] === 'B') {
      assert.equal(p.length, 4);
      const t = defs.get(Number(p[1])); assert.ok(t);
      const n = Number(p[2]);
      const cols = t!.specs.map(s => spec(s, n));
      const units: string[] = [];
      for (let i = 0; i < n; i++) {
        let u = t!.literals[0];
        for (let j = 0; j < cols.length; j++) u += cols[j][i] + t!.literals[j + 1];
        units.push(u);
      }
      out.push(units.join('\n') + (p[3] === '1' ? '\n' : ''));
    } else {
      throw new Error(`unknown line ${line.slice(0, 50)}`);
    }
  }
  return out.join('');
}

function fixtures() {
  const f = mosaicFixtures();
  return [
    ['arithmetic rows', Array.from({ length: 80 }, (_, i) => `id:${i} value:${100 + i}`).join('\n')],
    ['constant rows', Array.from({ length: 80 }, () => 'status=ok region=us-east-1').join('\n')],
    ['cycle rows', Array.from({ length: 84 }, (_, i) => `id:${i} region:${['us-east-1', 'eu-west-1', 'ap-south-1'][i % 3]}`).join('\n')],
    ['literal rows', Array.from({ length: 40 }, (_, i) => `id:${i} value:${(i * 37) % 101} note:${['cold', 'warm', 'hot', 'odd'][i % 4]}`).join('\n')],
    ['two-line records', Array.from({ length: 48 }, (_, i) => `user: step ${i}\nassistant: completed step ${i} with status ok`).join('\n')],
    ['variable JSON', f.jsonLog],
    ['CSV', f.csv],
    ['chat', f.chat],
    ['grid', f.grid],
    ['run length', f.rle],
    ['id run', f.idrun],
    ['heterogeneous report', CHAOS_F_LLM_REPORT],
    ['CJK hybrid', CHAOS_G_CJK],
    ['handtrace', MOSAIC_HANDTRACE_300],
    ['mixed agent turn', f.prose + '\n' + f.jsonLog + '\n' + f.rle + '\n' + f.chat],
  ] as Array<[string, string]>;
}

async function main() {
  console.log('HERMES-F independent red-team\n');

  await ok('decoder prompt states every wire production and is self-carried', () => {
    const p = hermesFractalDecoderPrompt();
    for (const phrase of ['no external', 'T id L S', 'B id n t', 'R J', '=J', '#a,d', '%J', '~J', 'exact text']) assert.match(p, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });

  await ok('all 15 regimes are exact under library and independent prompt-literal decode', async () => {
    for (const [name, text] of fixtures()) {
      const r = hermesFractalEncode(text);
      assert.equal(r.decoded, text, `${name}: encoder result`);
      assert.equal(hermesFractalDecode(r.wire), text, `${name}: library decode`);
      assert.equal(promptLiteralDecode(r.wire), text, `${name}: independent decode`);
      assert.ok(r.exact, `${name}: exact flag`);
    }
  });

  await ok('constant, arithmetic, cycle, literal and variable-width mechanisms all emit exact artifacts', () => {
    const cases = [
      Array.from({ length: 80 }, () => 'same same same').join('\n'),
      Array.from({ length: 80 }, (_, i) => `n=${i * 7 - 4}`).join('\n'),
      Array.from({ length: 90 }, (_, i) => `x=${['aa', 'bb', 'cc'][i % 3]}`).join('\n'),
      Array.from({ length: 50 }, (_, i) => `x=${i * 19 % 97} y=${i * 23 % 89}`).join('\n'),
      Array.from({ length: 40 }, (_, i) => `u:${i}\na:${i}\nb:${i}`).join('\n'),
    ];
    for (const text of cases) {
      const r = hermesFractalEncode(text);
      assert.equal(r.decoded, text);
      assert.equal(promptLiteralDecode(r.wire), text);
    }
  });

  await ok('hostile delimiters, Unicode, JSON escapes and frame-looking payload are exact', () => {
    const hostile = [
      '⟡F1\nR\t"not actually a program"',
      'tab\tquote " slash \\ newline\nnext\nnext',
      '∀⇒∆[x 9] 가각 日本語 数据 Привет 😀',
      'T\t0\t["fake"]\t[]\nB\t0\t99\t1',
      '\u0000\u0001\u0002\uE000\uE001\n'.repeat(3),
    ];
    for (const text of hostile) {
      const r = hermesFractalEncode(text);
      assert.equal(r.decoded, text);
      assert.equal(hermesFractalDecode(r.wire), text);
      assert.equal(promptLiteralDecode(r.wire), text);
    }
  });

  await ok('malformed HERMES-F frames are total and do not fabricate text', () => {
    for (const wire of [
      `${HERMES_F_START}\n`, `${HERMES_F_START}\nB\t0\t2\t0`,
      `${HERMES_F_START}\nT\t0\t[]\t[]\nB\t0\t0\t0`,
      `${HERMES_F_START}\nT\t0\t["x"]\t[]\nB\t0\t2\t2`,
      `${HERMES_F_START}\nX\tgarbage`,
    ]) assert.equal(hermesFractalDecode(wire), wire);
  });

  await ok('adaptive router is never worse than HERMES-Ω on M and strictly improves a real lane', async () => {
    const f = mosaicFixtures();
    const rows = [f.chat, f.jsonLog, f.csv, f.prose, CHAOS_F_LLM_REPORT, f.idrun];
    let strict = false;
    for (const text of rows) {
      const h = await hermesEncode(text);
      const a = await hermesAdaptiveEncode(text);
      assert.ok(a.messageTokens <= h.messageTokens, `adaptive M ${a.messageTokens} <= HERMES M ${h.messageTokens}`);
      if (a.messageTokens < h.messageTokens) strict = true;
      assert.equal(a.decoded, text);
    }
    const chatH = await hermesEncode(f.chat), chatF = hermesFractalEncode(f.chat);
    assert.ok(chatF.mode === 'fractal' && chatF.messageTokens < chatH.messageTokens, `chat strict ${chatF.messageTokens} < ${chatH.messageTokens}`);
    assert.ok(strict, 'at least one strict Pareto improvement');
  });

  await ok('message accounting uses the live tokenizer and honors identity for small prose', () => {
    for (const [name, text] of [['tiny', 'ordinary prose with no repeated structure'], ['short', 'The quick brown fox jumps over the lazy dog.']]) {
      const r = hermesFractalEncode(text);
      assert.equal(r.mode, 'raw', name);
      assert.equal(r.outTokens, countTokens(r.wire, 'o200k_base'));
      assert.equal(r.messageTokens, r.outTokens);
    }
  });

  await ok('250 structured fuzz cases: independent exactness and no throw', () => {
    let seed = 0x51f15e;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0x100000000; };
    const atoms = ['id', 'status', 'ok', 'warn', 'user', 'step', 'α', '数据', '😀', '"q"', 'tab\t', 'R', 'B', 'T'];
    for (let k = 0; k < 250; k++) {
      const n = 3 + Math.floor(rnd() * 35);
      const lines = Array.from({ length: n }, (_, i) => {
        const mode = k % 5;
        if (mode === 0) return `id:${i} ${atoms[Math.floor(rnd() * atoms.length)]}=${i % 7}`;
        if (mode === 1) return `{"i":${i},"ok":${i % 2 === 0},"v":"${atoms[Math.floor(rnd() * atoms.length)]}"}`;
        if (mode === 2) return `${atoms[Math.floor(rnd() * atoms.length)]} ${Math.floor(rnd() * 1000)}`;
        if (mode === 3) return `const x${i} = f(${i % 4}); // ${atoms[Math.floor(rnd() * atoms.length)]}`;
        return Array.from({ length: 2 + Math.floor(rnd() * 5) }, () => atoms[Math.floor(rnd() * atoms.length)]).join(' ');
      });
      const text = lines.join('\n');
      const r = hermesFractalEncode(text);
      assert.equal(r.decoded, text, `fuzz ${k}`);
      assert.equal(promptLiteralDecode(r.wire), text, `prompt fuzz ${k}`);
    }
  });

  await ok('speed sanity on an 8 KB mixed payload', () => {
    const text = (CHAOS_G_CJK + '\n' + CHAOS_F_LLM_REPORT).repeat(4);
    const t0 = Date.now();
    const r = hermesFractalEncode(text);
    assert.equal(r.decoded, text);
    assert.ok(r.ms < 5000, `encode ${r.ms}ms`);
  });

  console.log(`\n${passed}/${passed} HERMES-F gates passed`);
}

main().catch(e => { console.error(e); process.exit(1); });
