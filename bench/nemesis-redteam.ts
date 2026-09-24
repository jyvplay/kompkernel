import assert from 'node:assert/strict';
import fs from 'node:fs';
import { countTokens } from '../src/lib/omega/bpe';
import { KHOROS_OPERADS } from '../src/lib/omega/khoros-operads';
import { moiraEncode } from '../src/lib/omega/moira';
import { nemesisEncode, nemesisDecode, nemesisDecoderPrompt } from '../src/lib/omega/nemesis';

let passed = 0;
async function test(name: string, fn: () => unknown | Promise<unknown>) { await fn(); passed++; console.log(`[PASS] ${name}`); }
for (const file of fs.readdirSync('bench/holdout')) {
  await test(`holdout exact and <= MOIRA: ${file}`, async () => {
    const text = fs.readFileSync(`bench/holdout/${file}`, 'utf8');
    const [base, result] = await Promise.all([moiraEncode(text), nemesisEncode(text)]);
    assert.equal(result.decoded, text); assert.equal(await nemesisDecode(result.wire), text);
    assert.ok(result.outTokens <= base.outTokens, `${result.outTokens} > ${base.outTokens}`);
  });
}
for (const [file, minimum] of [['gh-api.json.txt', 50], ['code-ts.txt', 5]] as const) {
  await test(`strict frontier gain: ${file}`, async () => {
    const text = fs.readFileSync(`bench/holdout/${file}`, 'utf8');
    const [base, result] = await Promise.all([moiraEncode(text), nemesisEncode(text)]);
    console.log(`  receipt: MOIRA=${base.outTokens}, NEMESIS=${result.outTokens}, delta=${base.outTokens-result.outTokens}, outerRules=${result.outerRules}`);
    assert.ok(result.outTokens <= base.outTokens - minimum);
  });
}
await test('outer/inner delimiter and glyph injection', async () => {
  const text = ('◆\n◇\n耀="attack"\n◆\n◇\n※κ ◊ arbitrary \\quote\n').repeat(16);
  const r = await nemesisEncode(text); assert.equal(await nemesisDecode(r.wire), text);
});
await test('malformed outer wires are total', async () => {
  for (const w of ['◆\n', '◆\na=nope\n◆\nbody', '◆\na="x"']) assert.equal(typeof await nemesisDecode(w), 'string');
});
await test('exact tokenizer accounting', async () => {
  const text = fs.readFileSync('bench/holdout/gh-api.json.txt', 'utf8'); const r = await nemesisEncode(text);
  assert.equal(r.outTokens, countTokens(r.wire, 'o200k_base'));
});
await test('single-chat transitive closure contains payload and terminal mappings', async () => {
  const p = nemesisDecoderPrompt('PAYLOAD'); assert.ok(p.endsWith('PAYLOAD'));
  assert.match(p, /No system prompt, skills\.md/); assert.ok(p.includes('KAIROS TABLE'));
  assert.ok(p.includes(JSON.stringify(KHOROS_OPERADS[0]))); assert.ok(p.includes(JSON.stringify(KHOROS_OPERADS.at(-1))));
});
await test('modal shortcut: bare nested wire is not labeled self-contained', async () => {
  const text = fs.readFileSync('bench/holdout/gh-api.json.txt', 'utf8'); const r = await nemesisEncode(text);
  assert.ok(nemesisDecoderPrompt(r.wire).length > r.wire.length);
});
await test('4-way concurrent determinism', async () => {
  const text = fs.readFileSync('bench/holdout/code-ts.txt', 'utf8');
  const rs = await Promise.all(Array.from({length: 4}, () => nemesisEncode(text)));
  assert.equal(new Set(rs.map(r => r.wire)).size, 1);
});
console.log(`NEMESIS-Ω RED TEAM: ${passed}/${passed} passed`);
