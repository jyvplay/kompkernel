import fs from 'node:fs';
import assert from 'node:assert/strict';
import { dikeEncode, dikeDecode, dikeDecoderPrompt, DIKE_START } from '@/lib/omega/dike';
import { themisEncode, THEMIS_IMPLICIT_GLYPHS } from '@/lib/omega/themis';
import { countTokens } from '@/lib/omega/bpe';

let passed = 0;
async function pass(name: string, test: () => void | Promise<void>) { await test(); passed++; console.log(`✓ ${name}`); }

const input = fs.readFileSync('bench/holdout/gh-api.json.txt', 'utf8');
const [base, result] = await Promise.all([themisEncode(input), dikeEncode(input)]);
await pass('byte-perfect API reconstruction', () => assert.equal(result.decoded, input));
await pass('strictly advances THEMIS API frontier', () => assert.ok(result.outTokens <= base.outTokens - 5));
await pass('real token accounting', () => assert.equal(result.outTokens, countTokens(result.wire, 'o200k_base')));
await pass('escape-free mode selected', () => assert.ok(result.wire.startsWith(DIKE_START)));
await pass('substantial rule tape', () => assert.ok((result.framedRules ?? 0) >= 5));
await pass('deterministic decoder', async () => assert.equal(await dikeDecode(result.wire), input));
await pass('delimiter injection is absent from accepted tape', () => assert.ok(!result.wire.slice(1, result.wire.indexOf('乙')).includes('乙')));
await pass('malformed missing boundary is inert', async () => assert.equal(await dikeDecode('⬢abc'), '⬢abc'));
await pass('empty tape is inert', async () => assert.equal(await dikeDecode('⬢乙body'), '⬢乙body'));
await pass('ordinal reverse expansion is exact', () => {
  const g = THEMIS_IMPLICIT_GLYPHS[0];
  return dikeDecode(`⬢xyz乙${g}`).then(x => assert.equal(x, 'xyz'));
});
await pass('same-chat prompt is information-complete at DIKE layer', () => {
  const p = dikeDecoderPrompt(result.wire);
  assert.ok(p.includes('Split once at 乙') && p.includes('separated by 甲') && p.includes('No system prompt'));
});
await pass('Pareto tournament is non-expansive', () => assert.ok(result.outTokens <= base.outTokens));
console.log(`\n${passed}/12 DIKE adversarial passes`);
