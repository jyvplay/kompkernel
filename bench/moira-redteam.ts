import assert from 'node:assert/strict';
import fs from 'node:fs';
import { countTokens } from '../src/lib/omega/bpe';
import { anankeEncode } from '../src/lib/omega/ananke';
import { KHOROS_OPERADS } from '../src/lib/omega/khoros-operads';
import { moiraEncode, moiraDecode, moiraDecoderPrompt, optimizeConstituentLattice } from '../src/lib/omega/moira';

let passed = 0;
async function test(name: string, fn: () => unknown | Promise<unknown>) { await fn(); passed++; console.log(`[PASS] ${name}`); }

for (const file of fs.readdirSync('bench/holdout')) {
  await test(`holdout exact and <= ANANKE: ${file}`, async () => {
    const text = fs.readFileSync(`bench/holdout/${file}`, 'utf8');
    const [base, result] = await Promise.all([anankeEncode(text), moiraEncode(text)]);
    assert.equal(result.decoded, text); assert.equal(await moiraDecode(result.wire), text);
    assert.ok(result.outTokens <= base.outTokens, `${result.outTokens} > ${base.outTokens}`);
  });
}
for (const [file, minimum] of [['gh-api.json.txt', 20], ['code-ts.txt', 20], ['gh-prose.txt', 5]] as const) {
  await test(`strict frontier gain: ${file}`, async () => {
    const text = fs.readFileSync(`bench/holdout/${file}`, 'utf8');
    const [base, result] = await Promise.all([anankeEncode(text), moiraEncode(text)]);
    console.log(`  receipt: ANANKE=${base.outTokens}, MOIRA=${result.outTokens}, delta=${base.outTokens-result.outTokens}, rules=${result.rules}`);
    assert.ok(result.outTokens <= base.outTokens - minimum);
  });
}
await test('delimiter/glyph injection exactness', async () => {
  const text = ('◇\n耀="attack"\n◇\n※κ ◊\n arbitrary 漢字\\quote\n').repeat(16);
  const r = await moiraEncode(text); assert.equal(await moiraDecode(r.wire), text);
});
await test('malformed marked wires are total', async () => {
  for (const wire of ['◇\n', '◇\na=nope\n◇\nbody', '◇\na="x"']) assert.equal(typeof await moiraDecode(wire), 'string');
});
await test('exact tokenizer accounting', async () => {
  const text = fs.readFileSync('bench/holdout/code-ts.txt', 'utf8'); const r = await moiraEncode(text);
  assert.equal(r.outTokens, countTokens(r.wire, 'o200k_base'));
});
await test('single-chat closure includes all lower mappings and payload', async () => {
  const p = moiraDecoderPrompt('PAYLOAD'); assert.ok(p.endsWith('PAYLOAD'));
  assert.match(p, /No system prompt, skills\.md/); assert.ok(p.includes('KAIROS TABLE'));
  assert.ok(p.includes(JSON.stringify(KHOROS_OPERADS[0]))); assert.ok(p.includes(JSON.stringify(KHOROS_OPERADS.at(-1))));
});
await test('modal shortcut rejected: wire alone differs from complete chat message', async () => {
  const text = fs.readFileSync('bench/holdout/gh-prose.txt', 'utf8'); const r = await moiraEncode(text);
  assert.ok(moiraDecoderPrompt(r.wire).length > r.wire.length);
});
await test('incompressible residual exact fallback', () => {
  const s = Array.from({length: 400}, (_, i) => String.fromCodePoint(0x1000 + i)).join('');
  const r = optimizeConstituentLattice(s); assert.equal(r.wire, s); assert.equal(r.rules.length, 0);
});
await test('6-way concurrent determinism', async () => {
  const text = fs.readFileSync('bench/holdout/code-ts.txt', 'utf8');
  const rs = await Promise.all(Array.from({length: 6}, () => moiraEncode(text)));
  assert.equal(new Set(rs.map(r => r.wire)).size, 1);
});
console.log(`MOIRA-Ω RED TEAM: ${passed}/${passed} passed`);
