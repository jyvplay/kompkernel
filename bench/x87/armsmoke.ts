/** Smoke test: is the `aither` arm reachable through the registry's own entry list, and
 *  does `measure()` turn it into a well-formed CodecRun? This is the path the app uses. */
import * as fs from 'node:fs';
import { codecEntries, measure, realTokenCounter } from '../../src/lib/omega/registry';
const enc: any = 'o200k_base';
const entries = codecEntries();
console.log('registry entries:', entries.length);
const arm = entries.find((e: any) => e.key === 'aither');
if (!arm) { console.log('AITHER ARM NOT FOUND'); process.exit(1); }
console.log('found: key=%s family=%s fidelity=%s label=%d chars', arm.key, arm.family, arm.fidelity, arm.label.length);
const counter = realTokenCounter(enc);
const receipt: any[] = [];
for (const p of ['bench/holdout-x42b/free-m.txt', 'bench/holdout-x40/cue-sheet.md']) {
  const S = fs.readFileSync(p, 'utf8');
  const inTok = counter(S);
  const r: any = await measure(arm as any, S, enc, inTok);
  receipt.push({ lane: p, inTokens: inTok, outTokens: r.outTokens, oneChatTokens: r.oneChatTokens, exact: r.exact, ms: Math.round(r.ms), note: r.note });
  console.log(`\n${p}: in=${inTok} oneChat=${r.oneChatTokens ?? r.oneChat} exact=${r.exact} error=${r.error ?? 'none'} ms=${Math.round(r.ms)}`);
  console.log('  note:', String(r.note).slice(0, 190));
  // CodecRun carries no `decoded` field; `measure()` folds it into `exact` via
  // `r.decoded === text`, so `exact` is the round-trip signal and outTokens is G1.
  console.log('  exact(=decoded===source):', r.exact, ' outTokens===oneChat:', r.outTokens === r.oneChatTokens, ' output head:', JSON.stringify(String(r.output).slice(0, 46)));
}

import * as fs2 from 'node:fs';
fs2.mkdirSync('bench/x87/receipts', { recursive: true });
fs2.writeFileSync('bench/x87/receipts/arm-smoke.json', JSON.stringify({ entries: entries.length, key: arm.key, family: arm.family, fidelity: arm.fidelity, labelChars: arm.label.length, rows: receipt }, null, 1) + '\n');
console.log('\nwrote bench/x87/receipts/arm-smoke.json');
