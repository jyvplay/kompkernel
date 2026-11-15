/** X117 ΣΥΝΘΕΣΙΣ unit probes. Small synthetic listing; one tiny frontier call.
 * No corpus timing claim. */
import assert from 'node:assert/strict';
import { countTokens } from '../../src/lib/omega/bpe';
import { crc32 } from '../../src/lib/omega/aither';
import { enallageRewrite, enallageExpand, ENALLAGE_KEY } from '../../src/lib/omega/enallage';
import { mekosRewrite, mekosExpand, MEKOS_KEY } from '../../src/lib/omega/mekos';
import { symphyiaFit, symphyiaRewrite, symphyiaDecodeWire } from '../../src/lib/omega/symphyia';
import { synthesisKey, synthesisParseKey, synthesisDecodeBody, synthesisDecode, synthesisEncode, synthesisDisabled } from '../../src/lib/omega/synthesis';
import { tagstackDecode } from '../../src/lib/omega/tagstack';

Object.assign(process.env, { OMEGA_DET: '1', OMEGA_NO_MEMO: '1', OMEGA_ENGRAM: '0', OMEGA_OURA_MEMO: '0', OMEGA_NO_OROTHESIA: '1', OMEGA_SYNEDRIA: '1', OMEGA_SYNEDRIA_CHAIN: '1', OMEGA_ENALLAGE: '1', OMEGA_MEKOS: '1', OMEGA_SYNTHESIS: '1' });
const enc = 'o200k_base' as const;
let passed = 0;
function ok(name: string, fn: () => void) { fn(); passed++; console.log(`PASS ${name}`); }

function line(name: string, tail: string): string {
  const target = name + tail;
  return `lrwxrwxrwx 1 root root ${Buffer.byteLength(target, 'utf8')} Jan 1 00:00 ${name} -> ${target}\n`;
}
const names = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima']
  .map(n => 'lib' + n + '-long-component-with-more-letters-x86_64-linux-gnu');
const source = names.map((n, i) => line(n, '.so.' + (i + 1) + '.0.0')).join('');

ok('fused key is canonical, self-describing, and 40 tokens / 41 with LF', () => {
  const crc = '25b707b9';
  const key = synthesisKey({ j: 11, i: 9, marker: '※', crc });
  assert.equal(key, 'Body first. f11=f9+text after ※ (1-based); ^Tnnnn␠→T+chmod; λ=#bytes after ->. crc=25b707b9');
  assert.deepEqual(synthesisParseKey(key), { j: 11, i: 9, marker: '※', crc });
  assert.equal(countTokens(key, enc), 40);
  assert.equal(countTokens(key + '\n', enc), 41);
  // The cheaper spellings are real but drop clauses X90/X115 paid to keep.
  assert.equal(countTokens('Body first. f11=f9+※tail; λ=#bytes after ->; ^Tnnnn␠→T+chmod. crc=25b707b9\n', enc), 37);
  assert.equal(countTokens('Body first. f11=f9+text after ※; λ=#bytes after ->; ^Tnnnn␠→T+chmod. crc=25b707b9\n', enc), 38);
});

ok('parser refuses non-canonical, ambiguous, or damaged keys', () => {
  const good = synthesisKey({ j: 11, i: 9, marker: '※', crc: '25b707b9' });
  for (const bad of [
    good.replace('(1-based)', '(0-based)'),
    good.replace('text after ※', '※tail'),
    good.replace('T+chmod', 'chmod'),
    good.replace('crc=25b707b9', 'crc=25b707b'),
    good.replace('f11', 'f0'),
    good.replace('f9', 'f0'),
    good + ' ',
    ENALLAGE_KEY,
    MEKOS_KEY,
    'X90. Body first. f11 = f9 + text after ※ (1-based). crc=25b707b9',
  ]) assert.equal(synthesisParseKey(bad), null, bad);
});

ok('three rewrites commute and the fused own inverse is exact', () => {
  const mode = enallageRewrite(source)!;
  const measure = mekosRewrite(mode.wire)!;
  const pre = measure.wire;
  const m2 = mekosRewrite(source)!;
  const e2 = enallageRewrite(m2.wire)!;
  assert.equal(e2.wire, pre);
  const fit = symphyiaFit(pre);
  const marker = '※';
  assert.ok(!pre.includes(marker));
  const rule = fit.rules.find(r => r.form === 'tail' && r.A === '' && r.j === 11 && r.i === 9);
  assert.ok(rule, JSON.stringify(fit.rules));
  const rw = symphyiaRewrite(pre, [rule!], marker);
  assert.ok(rw.rewritten >= 4);
  const crc = crc32(new TextEncoder().encode(pre)).toString(16).padStart(8, '0');
  const parts = { j: 11, i: 9, marker, crc };
  assert.equal(symphyiaDecodeWire(rw.wire, [rule!], marker, crc), pre);
  assert.equal(synthesisDecodeBody(rw.wire, parts), source);
  assert.equal(mekosExpand(enallageExpand(pre)), source);
});

ok('CRC fails closed on a damaged fused body', () => {
  const mode = enallageRewrite(source)!;
  const pre = mekosRewrite(mode.wire)!.wire;
  const rule = symphyiaFit(pre).rules.find(r => r.form === 'tail' && r.A === '' && r.j === 11 && r.i === 9)!;
  const rw = symphyiaRewrite(pre, [rule], '※');
  const crc = crc32(new TextEncoder().encode(pre)).toString(16).padStart(8, '0');
  const parts = { j: 11, i: 9, marker: '※', crc };
  const damaged = rw.wire.replace('※.so.1', '※.so.2');
  assert.throws(() => synthesisDecodeBody(damaged, parts), /CRC|contract/);
});

ok('tagstackDecode dispatches the fused key after the parent decoder', () => {
  const mode = enallageRewrite(source)!;
  const pre = mekosRewrite(mode.wire)!.wire;
  const rule = symphyiaFit(pre).rules.find(r => r.form === 'tail' && r.A === '' && r.j === 11 && r.i === 9)!;
  const rw = symphyiaRewrite(pre, [rule], '※');
  const crc = crc32(new TextEncoder().encode(pre)).toString(16).padStart(8, '0');
  const msg = synthesisKey({ j: 11, i: 9, marker: '※', crc }) + '\n' + rw.wire;
  assert.equal(tagstackDecode(msg, (x) => x), source);
  assert.equal(synthesisDecode(msg, (x) => x), source);
  // The body here is already the pre-frontier rewrite, so the bare dispatcher
  // (no parent decoder) reads it too. A dense parent body is NOT pre-expanded;
  // feeding one without its parent decoder must fail closed on the CRC.
  assert.equal(tagstackDecode(msg), source);
  const dense = synthesisKey({ j: 11, i: 9, marker: '※', crc }) + '\n§dense glyph tape, not fields\n';
  assert.throws(() => tagstackDecode(dense), /CRC|contract/);
});

ok('encode fires on the synthetic conjunction and beats a generous incumbent', () => {
  const r = synthesisEncode(source, enc, 10_000);
  assert.equal(r.applied, true);
  assert.equal(r.exact, true);
  assert.equal(r.decoded, source);
  assert.equal(r.hits.mode, 12);
  assert.equal(r.hits.measure, 12);
  assert.ok(r.hits.template >= 4);
  assert.equal(countTokens(r.message, enc), r.messageTokens);
  assert.ok(r.message.startsWith('Body first. f11=f9+text after ※ (1-based);'));
  // The inner body is a dense parent message; the dispatch unit above covers the
  // fused key with an explicit parent decoder. Here the encoder's composed
  // inverse (r.decoded) is the exactness claim.
  assert.equal(r.decoded, source);
});

ok('strict complete-message gate refuses a loss', () => {
  const r = synthesisEncode(source, enc, 1);
  assert.equal(r.applied, false);
  assert.equal(r.message, source);
  assert.equal(r.decoded, source);
  assert.match(r.notes, /G5 loses/);
});

ok('kill switches refuse without touching the source', () => {
  process.env.OMEGA_SYNTHESIS = '0';
  assert.equal(synthesisDisabled(), true);
  let r = synthesisEncode(source, enc, 10_000);
  assert.equal(r.applied, false);
  assert.equal(r.message, source);
  process.env.OMEGA_SYNTHESIS = '1';
  process.env.OMEGA_NO_ENALLAGE = '1';
  r = synthesisEncode(source, enc, 10_000);
  assert.equal(r.applied, false);
  assert.match(r.notes, /ΕΝΑΛΛΑΓΗ constituent disabled/);
  delete process.env.OMEGA_NO_ENALLAGE;
  process.env.OMEGA_NO_MEKOS = '1';
  r = synthesisEncode(source, enc, 10_000);
  assert.equal(r.applied, false);
  assert.match(r.notes, /ΜΗΚΟΣ constituent disabled/);
  delete process.env.OMEGA_NO_MEKOS;
});

ok('non-conjunction domains refuse cheaply', () => {
  assert.equal(synthesisEncode('hello world\n', enc, 10_000).applied, false);
  assert.equal(synthesisEncode('-rw-r--r-- 1 root root 0 Jan 1 00:00 f\n', enc, 10_000).applied, false);
  const noTemplate = 'lrwxrwxrwx 1 root root 6 Jan 1 00:00 link -> target\n';
  assert.equal(synthesisEncode(noTemplate, enc, 10_000).applied, false);
});

console.log(`${passed} passed`);
