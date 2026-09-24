import assert from 'node:assert/strict';
import fs from 'node:fs';
import { countTokens } from '../src/lib/omega/bpe';
import { KHOROS_OPERADS } from '../src/lib/omega/khoros-operads';
import { nemesisEncode } from '../src/lib/omega/nemesis';
import { themisEncode, themisDecode, themisDecoderPrompt, THEMIS_IMPLICIT_GLYPHS } from '../src/lib/omega/themis';

let passed = 0;
async function test(name: string, fn: () => unknown | Promise<unknown>) { await fn(); passed++; console.log(`[PASS] ${name}`); }
for (const file of fs.readdirSync('bench/holdout')) {
  await test(`holdout exact and <= NEMESIS: ${file}`, async () => {
    const text = fs.readFileSync(`bench/holdout/${file}`, 'utf8');
    const [base, result] = await Promise.all([nemesisEncode(text), themisEncode(text)]);
    assert.equal(result.decoded, text); assert.equal(await themisDecode(result.wire), text);
    assert.ok(result.outTokens <= base.outTokens, `${result.outTokens} > ${base.outTokens}`);
  });
}
for (const [file, minimum] of [['gh-api.json.txt', 20], ['code-ts.txt', 5]] as const) {
  await test(`strict frontier gain: ${file}`, async () => {
    const text = fs.readFileSync(`bench/holdout/${file}`, 'utf8');
    const [base, result] = await Promise.all([nemesisEncode(text), themisEncode(text)]);
    console.log(`  receipt: NEMESIS=${base.outTokens}, THEMIS=${result.outTokens}, delta=${base.outTokens-result.outTokens}, rules=${result.succinctRules}`);
    assert.ok(result.outTokens <= base.outTokens - minimum);
  });
}
await test('implicit-symbol collision fallback remains exact', async () => {
  const text = (`natural Korean collision ${THEMIS_IMPLICIT_GLYPHS.slice(0, 20).join('')} and repeated REST payload\n`).repeat(12);
  const r = await themisEncode(text); assert.equal(await themisDecode(r.wire), text);
});
await test('delimiter and JSON injection exactness', async () => {
  const text = ('⬡["attack\\n"]\n◆\n◇\n※κ arbitrary \\quote\n').repeat(20);
  const r = await themisEncode(text); assert.equal(await themisDecode(r.wire), text);
});
await test('malformed succinct wires are total', async () => {
  for (const w of ['⬡', '⬡nope\nbody', '⬡[1]\nbody', '⬡[]']) assert.equal(typeof await themisDecode(w), 'string');
});
await test('exact tokenizer accounting', async () => {
  const text = fs.readFileSync('bench/holdout/gh-api.json.txt', 'utf8'); const r = await themisEncode(text);
  assert.equal(r.outTokens, countTokens(r.wire, 'o200k_base'));
});
await test('implicit symbols are one o200k token', () => {
  for (const g of THEMIS_IMPLICIT_GLYPHS.slice(0, 64)) assert.equal(countTokens(g, 'o200k_base'), 1);
});
await test('single-chat closure includes symbol order, payload, and terminal mappings', async () => {
  const p = themisDecoderPrompt('PAYLOAD'); assert.ok(p.endsWith('PAYLOAD'));
  assert.match(p, /No system prompt, skills\.md/); assert.ok(p.includes(THEMIS_IMPLICIT_GLYPHS.slice(0, 20).join('')));
  assert.ok(p.includes(JSON.stringify(KHOROS_OPERADS[0]))); assert.ok(p.includes(JSON.stringify(KHOROS_OPERADS.at(-1))));
});
await test('modal shortcut rejects bare implicit-symbol wire', async () => {
  const text = fs.readFileSync('bench/holdout/gh-api.json.txt', 'utf8'); const r = await themisEncode(text);
  assert.ok(themisDecoderPrompt(r.wire).length > r.wire.length);
});
await test('4-way concurrent determinism', async () => {
  const text = fs.readFileSync('bench/holdout/code-ts.txt', 'utf8');
  const rs = await Promise.all(Array.from({length: 4}, () => themisEncode(text)));
  assert.equal(new Set(rs.map(r => r.wire)).size, 1);
});
console.log(`THEMIS-Ω RED TEAM: ${passed}/${passed} passed`);
