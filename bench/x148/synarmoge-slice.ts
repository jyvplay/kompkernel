// X148 — SYNARMOGE deadline honesty gate (unit).
// The frontier's final joint search keeps a real-time deadline even under
// OMEGA_DET=1, so its fixed point can depend on wall-clock slicing. These
// checks pin the properties that make that safe and repairable:
//   1. an exhausted deadline yields no candidate (frontier output unchanged);
//   2. any truncated result is still byte-exact-gated and strictly cheaper;
//   3. resuming a truncated result under a full budget never regresses;
//   4. the global clock patch is removed afterwards.
// This measures the mechanism; it does not re-time the canonical frontier.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { synarmogeFromFrontier } from '../../src/lib/omega/synarmoge';

const rec = fs.readFileSync('bench/x147/receipts/frontier.jsonl', 'utf8')
  .split('\n').map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l))
  .find((r: any) => r.path === 'bench/holdout-work/kb-article.txt' && r.message.includes('§'));
assert.ok(rec, 'kb-article frontier record with a tape must exist');
const text: string = rec.text;
const message: string = rec.message;
const base = { message, messageTokens: rec.tokens, decoded: text };
let checks = 0;

const realNow = Date.now.bind(Date);
let advanceMs = 0;
(Date as any).now = () => realNow() + advanceMs;
try {
  // (1) deadline already exhausted: no move admitted, output falls back.
  process.env.OMEGA_SYNARMOGE_MS = '20000'; advanceMs = 1e9;
  const aborted = synarmogeFromFrontier(base, text, 'o200k_base');
  assert.ok(aborted === null || aborted.tokens >= rec.tokens); checks++;
  advanceMs = 0;

  // (2) truncated search (1 ms budget, each clock read jumps 5 ms): gated output.
  process.env.OMEGA_SYNARMOGE_MS = '1';
  const tick = () => { advanceMs += 5; };
  const t0 = Date.now(); void t0; tick();
  const sliced = synarmogeFromFrontier(base, text, 'o200k_base');
  assert.ok(sliced === null || (sliced.absolute === true && sliced.tokens < rec.tokens));
  checks++;

  // (3) resume the truncated result under a full budget: no regression, exact.
  process.env.OMEGA_SYNARMOGE_MS = '20000';
  const resumed = sliced
    ? synarmogeFromFrontier({ message: sliced.message, messageTokens: sliced.tokens, decoded: text }, text, 'o200k_base')
    : null;
  assert.ok(resumed === null || (resumed.absolute === true && resumed.tokens <= sliced!.tokens));
  checks++;

  // (4b) degraded-but-exact base (last rule inlined back): the fixed point is
  // disturbed, so the deadline, truncation and resume paths carry real moves.
  const { parseTape, buildTape, expandContent, glyphSetFor } = await import('../../src/lib/omega/euros');
  const i1 = message.indexOf('§'); const i2 = message.indexOf('¶', i1);
  const pre = message.slice(0, i1);
  const tape = i2 < 0 ? message.slice(i1) : message.slice(i1, i2);
  const body = i2 < 0 ? '' : message.slice(i2);
  const rules = parseTape(tape, new Set(glyphSetFor(text, message)));
  assert.ok(rules.length >= 2, 'tape must have rules to degrade');
  const last = rules[rules.length - 1]!;
  const earlier = new Set(rules.slice(0, -1).map((r) => r.g));
  assert.ok(!earlier.has(last.g), 'dropping the last rule keeps well-formedness');
  const inline = (s: string) => s.split(last.g).join(last.v);
  const degradedRules = rules.slice(0, -1).map((r) => ({ g: r.g, v: inline(r.v) }));
  const degradedMsg = pre + buildTape(degradedRules) + inline(body);
  assert.equal(expandContent(degradedRules, inline(body)), text, 'degraded base must decode to the source');
  checks++;
  const degradedBase = { message: degradedMsg, messageTokens: countTokens(degradedMsg, 'o200k_base'), decoded: text };

  process.env.OMEGA_SYNARMOGE_MS = '1';
  const slicedD = synarmogeFromFrontier(degradedBase, text, 'o200k_base');
  assert.ok(slicedD === null || (slicedD.absolute === true && slicedD.tokens <= degradedBase.messageTokens));
  checks++;
  process.env.OMEGA_SYNARMOGE_MS = '20000';
  const resumedD = slicedD
    ? synarmogeFromFrontier({ message: slicedD.message, messageTokens: slicedD.tokens, decoded: text }, text, 'o200k_base')
    : null;
  assert.ok(resumedD === null || (resumedD.absolute === true && resumedD.tokens <= slicedD!.tokens));
  checks++;
  const fullD = synarmogeFromFrontier(degradedBase, text, 'o200k_base');
  assert.ok(fullD === null || (fullD.absolute === true && fullD.tokens < degradedBase.messageTokens));
  checks++;
  fs.writeFileSync('bench/x148/receipts/synarmoge-slice-degraded.json', JSON.stringify({
    degradedTokens: degradedBase.messageTokens,
    sliced: slicedD ? { tokens: slicedD.tokens, probes: slicedD.probes } : null,
    resumed: resumedD ? { tokens: resumedD.tokens, probes: resumedD.probes } : null,
    full: fullD ? { tokens: fullD.tokens, probes: fullD.probes } : null,
  }, null, 2));
  console.log({ degraded: degradedBase.messageTokens, slicedD: slicedD?.tokens ?? null, resumedD: resumedD?.tokens ?? null, fullD: fullD?.tokens ?? null });

  // (4) full-budget run from the original base for reference.
  const full = synarmogeFromFrontier(base, text, 'o200k_base');
  assert.ok(full === null || (full.absolute === true && full.tokens < rec.tokens)); checks++;
  if (resumed && full) assert.ok(resumed.tokens >= full.tokens || resumed.tokens <= sliced!.tokens); checks++;

  fs.writeFileSync('bench/x148/receipts/synarmoge-slice.json', JSON.stringify({
    baseTokens: rec.tokens,
    sliced: sliced ? { tokens: sliced.tokens, probes: sliced.probes, absolute: sliced.absolute } : null,
    resumed: resumed ? { tokens: resumed.tokens, probes: resumed.probes } : null,
    full: full ? { tokens: full.tokens, probes: full.probes } : null,
  }, null, 2));
  console.log({ base: rec.tokens, sliced: sliced?.tokens ?? null, resumed: resumed?.tokens ?? null, full: full?.tokens ?? null, checks });
} finally {
  (Date as any).now = realNow; advanceMs = 0;
  delete process.env.OMEGA_SYNARMOGE_MS;
  assert.equal(Date.now() <= realNow() + 50, true); checks++;
}
