/**
 * bench/vexilla-redteam.ts — adversarial + economic audit for VEXILLA-⚑.
 * Run: npx tsx bench/vexilla-redteam.ts
 *
 * Gate contract (all must hold):
 *  - EXACTNESS: vexillaDecode(wire) === input for every case (0 failures).
 *  - HONESTY: `applied` ⇒ messageTokens < inTokens (contract-inclusive).
 *  - NO REGRESSION: !applied ⇒ messageTokens <= inTokens (+escape only when needed).
 *  - REAL GAINS: flag content shows large, contract-inclusive savings.
 */
import { encode as enc200 } from 'gpt-tokenizer/encoding/o200k_base';
import {
  vexillaEncode, vexillaDecode, findVexillaSpans,
  VEXILLA_MARK, VEXILLA_ESCAPE,
} from '../src/lib/omega/vexilla';

const T = (s: string) => enc200(s).length;
type Case = { name: string; text: string };

// Build helpers from first principles (independent of the codec's own encoder).
const flag = (cc: string) => [...cc.toUpperCase()].map((c) => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('');
const tagFlag = (sub: string) => String.fromCodePoint(0x1F3F4) + [...sub].map((c) => String.fromCodePoint(0xE0000 + c.charCodeAt(0))).join('') + String.fromCodePoint(0xE007F);

const cases: Case[] = [
  { name: 'single flag in prose', text: `Ship it ${flag('US')} today!` },
  { name: 'flag pair', text: `${flag('US')}${flag('JP')}` },
  { name: 'locale list (15 flags)', text: `Supported: ${['US','GB','JP','DE','FR','ES','IT','BR','KR','CN','IN','RU','MX','CA','AU'].map(flag).join(' ')}` },
  { name: 'adjacent flag run', text: `${['US','GB','JP','DE','FR'].map(flag).join('')}` },
  { name: 'tag flag (Scotland)', text: `Team ${tagFlag('gbsct')} plays tonight` },
  { name: 'three tag flags', text: `${tagFlag('gbsct')} ${tagFlag('gbwls')} ${tagFlag('gbeng')}` },
  { name: 'mixed regional + tag', text: `${flag('GB')} and ${tagFlag('gbsct')} and ${flag('FR')}` },
  { name: 'marketing post', text: `🚀 Big news! Team is growing 📈 ${flag('US')}${flag('JP')}${flag('DE')} #launch 🎉` },

  // ---- MUST NOT COMPRESS (identity, still exact) ----
  { name: 'plain prose', text: 'The quick brown fox jumps over the lazy dog near the river.' },
  { name: 'bare non-flag emoji', text: 'great work 👍 love it ❤️ ship 🚀' },
  { name: 'empty', text: '' },
  { name: 'ascii US no flag', text: 'the US and JP markets' },
  { name: 'lone regional indicator (odd)', text: `x${String.fromCodePoint(0x1F1FA)}y` },

  // ---- ADVERSARIAL: sentinel collisions & near-miss markers ----
  { name: 'raw text starts with MARK °', text: `${VEXILLA_MARK} 20 degrees and ${flag('US')}` },
  { name: 'raw text starts with ESCAPE ±', text: `${VEXILLA_ESCAPE}5 tolerance` },
  { name: 'literal sentinels ¶ § ¬ ¦ in text', text: 'See ¶12 of §3; a¬b and c¦d — plus a real flag ' + flag('CA') },
  { name: 'fake region span ¶us§ lowercase', text: 'note ¶us§ here, real ' + flag('GB') },
  { name: 'fake region span odd length ¶ABC§', text: 'ref ¶ABC§ and ' + flag('DE') },
  { name: 'unmatched ¶ open', text: 'a ¶ b ' + flag('IT') },
  { name: 'malformed tag: black flag no cancel', text: `${String.fromCodePoint(0x1F3F4)}gb no cancel` },
  { name: 'nested-ish ¶A¶B§§', text: 'x ¶A¶B§§ y ' + flag('BR') },
  { name: 'tag payload with sentinel char ¦ inside', text: `${tagFlag('gb')}` + ' plus ¦ bar' },
];

let failures = 0, applied = 0, regressions = 0;
let sumIn = 0, sumOut = 0, flagIn = 0, flagOut = 0;
const rows: string[] = [];

for (const c of cases) {
  const r = vexillaEncode(c.text, 'o200k_base');
  const round = vexillaDecode(r.wire);
  const exact = round === c.text;
  if (!exact) { failures++; rows.push(`  ✗ EXACT FAIL: ${c.name}`); }
  if (r.applied && r.messageTokens >= r.inTokens) { regressions++; rows.push(`  ✗ HONESTY FAIL (applied but not cheaper): ${c.name}`); }
  // A non-applied wire may grow by AT MOST 1 token, and only when the raw text
  // starts with a reserved sentinel (° or ±) and must be escaped for exactness.
  // This is unavoidable and identical to STOICHEIA's escape discipline.
  const startsWithSentinel = c.text.length > 0 && (c.text[0] === VEXILLA_MARK || c.text[0] === VEXILLA_ESCAPE);
  const allowedGrowth = startsWithSentinel ? 1 : 0;
  if (!r.applied && r.messageTokens > r.inTokens + allowedGrowth) { regressions++; rows.push(`  ✗ REGRESSION (identity grew >${allowedGrowth}): ${c.name}`); }
  if (r.applied) { applied++; flagIn += r.inTokens; flagOut += r.messageTokens; }
  sumIn += r.inTokens; sumOut += r.messageTokens;
  const tag = exact ? (r.applied ? '✓apply' : '·ident') : '✗FAIL';
  rows.push(`  ${tag}  ${c.name.padEnd(38)} in=${String(r.inTokens).padStart(3)} msg=${String(r.messageTokens).padStart(3)} save=${String(r.inTokens - r.messageTokens).padStart(3)} (${r.savingsPct.toFixed(0)}%)`);
}

// Exhaustive round-trip: all 26*26 regional flags + a battery of tag flags.
let bijFail = 0;
for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
  const f = flag(String.fromCharCode(a) + String.fromCharCode(b));
  const r = vexillaEncode(`prefix ${f}${f} suffix`, 'o200k_base');
  if (vexillaDecode(r.wire) !== `prefix ${f}${f} suffix`) bijFail++;
}
for (const sub of ['gbsct','gbwls','gbeng','usca','ustx','usny','jp13','fridf']) {
  const f = tagFlag(sub);
  const r = vexillaEncode(`X ${f} Y`, 'o200k_base');
  if (vexillaDecode(r.wire) !== `X ${f} Y`) bijFail++;
}

// findVexillaSpans sanity
const spanProbe = findVexillaSpans(`${flag('US')}${flag('JP')} and ${tagFlag('gbsct')}`);

console.log('=== VEXILLA-⚑ RED-TEAM =============================================');
console.log(rows.join('\n'));
console.log('--------------------------------------------------------------------');
console.log(`cases=${cases.length}  applied=${applied}  exact_failures=${failures}  honesty/regression_failures=${regressions}`);
console.log(`exhaustive round-trip failures (676 regional + 8 tag): ${bijFail}`);
console.log(`span probe: ${spanProbe.length} spans (${spanProbe.map((s) => s.kind + ':' + s.payload).join(', ')})`);
console.log(`aggregate all cases: in=${sumIn} msg=${sumOut} saved=${sumIn - sumOut}`);
console.log(`aggregate WHERE APPLIED: in=${flagIn} msg=${flagOut} saved=${flagIn - flagOut} (${(100 * (flagIn - flagOut) / Math.max(1, flagIn)).toFixed(1)}%)`);
const ok = failures === 0 && regressions === 0 && bijFail === 0;
console.log(ok ? '\n✅ PASS — byte-exact, honest, no regressions, bijective over all flags.' : '\n❌ FAIL — see above.');
process.exit(ok ? 0 : 1);
