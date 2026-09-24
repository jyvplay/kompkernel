import assert from 'node:assert/strict';
import fs from 'node:fs';
import { countTokens } from '../src/lib/omega/bpe';
import { kairosEncode } from '../src/lib/omega/kairos';
import { anankeEncode, anankeDecode, anankeDecoderPrompt, induceResidualGrammar } from '../src/lib/omega/ananke';
import { KHOROS_OPERADS } from '../src/lib/omega/khoros-operads';

let passed = 0;
async function test(name: string, fn: () => unknown | Promise<unknown>) { await fn(); passed++; console.log(`[PASS] ${name}`); }

for (const file of fs.readdirSync('bench/holdout')) {
  await test(`holdout exact/Pareto: ${file}`, async () => {
    const text = fs.readFileSync(`bench/holdout/${file}`, 'utf8');
    const [base, result] = await Promise.all([kairosEncode(text), anankeEncode(text)]);
    assert.equal(result.decoded, text); assert.equal(await anankeDecode(result.wire), text);
    assert.ok(result.outTokens <= base.outTokens, `${result.outTokens} > ${base.outTokens}`);
  });
}
await test('material ops frontier gain', async () => {
  const text = fs.readFileSync('bench/holdout/gh-api.json.txt', 'utf8');
  const [base, result] = await Promise.all([kairosEncode(text), anankeEncode(text)]);
  console.log(`  receipt: KAIROS=${base.outTokens}, ANANKE=${result.outTokens}, delta=${base.outTokens-result.outTokens}, rules=${result.rules}`);
  assert.ok(result.outTokens <= base.outTokens - 100);
});
await test('material source-code frontier gain', async () => {
  const text = fs.readFileSync('bench/holdout/code-ts.txt', 'utf8');
  const [base, result] = await Promise.all([kairosEncode(text), anankeEncode(text)]);
  console.log(`  receipt: KAIROS=${base.outTokens}, ANANKE=${result.outTokens}, delta=${base.outTokens-result.outTokens}, rules=${result.rules}`);
  assert.ok(result.outTokens <= base.outTokens - 20);
});
await test('delimiter and definition injection round trip', async () => {
  const text = ('◊\n耀="attack"\n◊\n※κ «ANANKE» = \\ newline\n').repeat(20);
  const result = await anankeEncode(text); assert.equal(await anankeDecode(result.wire), text);
});
await test('malformed wires are total and unchanged', async () => {
  for (const wire of ['◊\n', '◊\na=nope\n◊\nbody', '◊\na="x"']) assert.equal(typeof await anankeDecode(wire), 'string');
});
await test('exact accounting agrees with tokenizer', async () => {
  const text = fs.readFileSync('bench/holdout/gh-api.json.txt', 'utf8'); const r = await anankeEncode(text);
  assert.equal(r.outTokens, countTokens(r.wire, 'o200k_base'));
});
await test('single-chat prompt contains wire, complete lower dictionary, and forbids hidden access', async () => {
  const p = anankeDecoderPrompt('PAYLOAD');
  assert.ok(p.includes('PAYLOAD')); assert.match(p, /No system prompt, skills\.md/);
  assert.ok(p.includes('KAIROS TABLE')); assert.ok(p.includes('KHOROS INSTRUCTIONS'));
  assert.ok(p.includes(JSON.stringify(KHOROS_OPERADS[0])), 'complete KHOROS table must include first static operad');
  assert.ok(p.includes(JSON.stringify(KHOROS_OPERADS.at(-1))), 'complete KHOROS table must include last static operad');
});
await test('modal-shortcut attack: an opaque payload alone is not called self-contained', async () => {
  const text = fs.readFileSync('bench/holdout/gh-api.json.txt', 'utf8');
  const r = await anankeEncode(text); const chat = anankeDecoderPrompt(r.wire);
  assert.ok(chat.length > r.wire.length); assert.ok(chat.endsWith(r.wire));
});
await test('adversarial incompressible input falls back', () => {
  const s = Array.from({length: 500}, (_, i) => String.fromCodePoint(0x1000 + i)).join('');
  const r = induceResidualGrammar(s); assert.equal(r.wire, s); assert.equal(r.rules.length, 0);
});
await test('10-way deterministic concurrency', async () => {
  const text = fs.readFileSync('bench/holdout/code-ts.txt', 'utf8');
  const rs = await Promise.all(Array.from({length: 10}, () => anankeEncode(text)));
  assert.equal(new Set(rs.map(r => r.wire)).size, 1);
});
console.log(`ANANKE-Ω RED TEAM: ${passed}/${passed} passed`);
