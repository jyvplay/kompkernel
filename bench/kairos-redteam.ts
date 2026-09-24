import assert from 'node:assert/strict';
import fs from 'node:fs';
import { countTokens } from '../src/lib/omega/bpe';
import { khorosEncode } from '../src/lib/omega/khoros';
import { kairosEncode, kairosDecode, kairosDecoderPrompt, KAIROS_RULES } from '../src/lib/omega/kairos';

let pass = 0;
const test = async (name: string, fn: () => Promise<void> | void) => { await fn(); pass++; console.log(`[PASS] ${name}`); };

for (const file of fs.readdirSync('bench/holdout')) {
  await test(`holdout exact/non-expanding: ${file}`, async () => {
    const text = fs.readFileSync(`bench/holdout/${file}`, 'utf8');
    const r = await kairosEncode(text);
    assert.equal(r.decoded, text); assert.equal(await kairosDecode(r.wire), text);
    assert.ok(r.outTokens <= countTokens(text, 'o200k_base'));
  });
}
await test('strict frontier improvement on REST/ops JSON', async () => {
  const text = fs.readFileSync('bench/holdout/gh-api.json.txt', 'utf8');
  const [k, n] = await Promise.all([khorosEncode(text), kairosEncode(text)]);
  assert.ok(n.outTokens <= k.outTokens - 20, `${n.outTokens} vs ${k.outTokens}`);
  console.log(`  receipt: KHOROS=${k.outTokens}, KAIROS=${n.outTokens}, delta=${k.outTokens - n.outTokens}`);
});
await test('reserved-glyph collision fallback', async () => {
  const text = `literal ${KAIROS_RULES[0][0]} plus "url": "https://api.github.com/users/example"`;
  const r = await kairosEncode(text); assert.equal(r.decoded, text);
});
await test('malformed input is total', async () => { assert.equal(typeof await kairosDecode('※κnonsense'), 'string'); });
await test('30-way deterministic concurrency', async () => {
  const t = fs.readFileSync('bench/holdout/gh-api.json.txt', 'utf8');
  const rs = await Promise.all(Array.from({length: 30}, () => kairosEncode(t)));
  assert.equal(new Set(rs.map(r => r.wire)).size, 1);
});
await test('all replacement glyphs are one o200k token', () => {
  for (const [g] of KAIROS_RULES) assert.equal(countTokens(g, 'o200k_base'), 1, g);
});
await test('single-chat preamble is self-contained', () => {
  const prompt = kairosDecoderPrompt();
  assert.match(prompt, /No system prompt or skills file is available/);
  for (const [g, phrase] of KAIROS_RULES) {
    assert.ok(prompt.includes(g)); assert.ok(prompt.includes(JSON.stringify(phrase)));
  }
});
console.log(`KAIROS-Ω RED TEAM: ${pass}/${pass} passed`);
