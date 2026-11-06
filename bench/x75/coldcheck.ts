/**
 * X75 / GATE 6 (partial, verifiable half) — the operator read the CONTRACTED 25-token
 * rules clause and hand-extracted the rule table from the tape. This checks that
 * hand-derived table against the parser's own parse of the same tape.
 * If they agree, the contracted sentence was interpreted correctly by a reader that
 * had nothing but the message.
 */
import { chironParseTape, CHIRON_SCRIPTS, type ParsedRule } from '../../src/lib/omega/chiron';
const tape = 'А\n2026-10-24T00:т\tupАл:00Z\tnvme0nы\t⁺хы.ж.0\t0.рыжа⁺яхарасл0ятол1италјаояиг\tdownАвы.ардтасјеаянх0раг';
// HAND-EXTRACTED, by reading "Before ¶ a new Cyrillic letter names text to the next new
// letter or ¶." — no source, no system prompt, no other context.
const mine: Record<string, string> = {
  'А': '\n2026-10-24T00:', 'т': '\tupА', 'л': ':00Z\tnvme0n', 'ы': '\t⁺', 'х': 'ы.',
  'ж': '.0\t0.', 'р': 'ыж', 'а': '⁺', 'я': 'хара', 'с': 'л0ят', 'о': 'л1',
  'и': 'тал', 'ј': 'аояи', 'г': '\tdownА', 'в': 'ы.ар', 'д': 'тасј', 'е': 'ая',
  'н': 'х0раг',
};
const cyr = CHIRON_SCRIPTS.find((s) => s.name === 'cyrillic')!;
const parsed: ParsedRule[] | null = chironParseTape(tape, cyr);
if (parsed === null) { console.log('GATE 6: parser rejected the tape'); process.exit(1); }
const theirs: Record<string, string> = {};
for (const r of parsed) theirs[r.glyph] = r.raw;
const keys = Object.keys(mine);
let bad = 0;
for (const k of keys) {
  const t = theirs[k];
  const ok = t === mine[k];
  if (!ok) { bad++; console.log(`MISMATCH ${k}: mine ${JSON.stringify(mine[k])} parser ${JSON.stringify(t)}`); }
}
console.log(`rules hand-extracted ${keys.length}, parser rules ${Object.keys(theirs).length}, mismatches ${bad}`);
console.log(bad === 0 && Object.keys(theirs).length === keys.length
  ? 'GATE 6 (rule-extraction half): PASS — the contracted sentence yielded the correct tape'
  : 'GATE 6 (rule-extraction half): FAIL');
