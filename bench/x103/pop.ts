/**
 * X103 — POPULATION CENSUS for a candidate move: RELOCATE-TO-ENABLE FOR INTERIOR FACTORS.
 *
 * What exists in the stack:
 *   ΠΡΟΟΙΜΙΟΝ (in ΣΥΝΔΥΑΣΜΟΣ) re-spells value(i) as an interleaving of literal runs and
 *     references to STRICTLY EARLIER rules.  Interior factors included.
 *   ΓΕΝΝΑΔΑΣ relocate-to-enable finds a rule j AFTER i whose value is a perfect PREFIX or
 *     SUFFIX of value(i), moves j just before i, and re-spells only that boundary.
 *   ⇒ a rule j AFTER i whose value is a proper INTERIOR substring of value(i) is a factor that
 *     NO codec can currently use: ΠΡΟΟΙΜΙΟΝ cannot (j is later), ΓΕΝΝΑΔΑΣ will not (not a
 *     boundary).  If that population is non-empty, the move is available; if it is empty the
 *     idea is dead before it is written.
 *
 * CONTROL: the same census restricted to prefix/suffix factors, which is ΓΕΝΝΑΔΑΣ's population.
 * A control must be checked against a number the code under test did not produce — here it is the
 * shipped codec's own population, counted by the same routine.
 */
import * as fs from 'node:fs';
import { CHIRON_START, chironDecode } from '../../src/lib/omega/chiron';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const plan = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runK.json', 'utf8')).rows as any[];
function parseTape(msg: string) {
  const w = msg.indexOf(CHIRON_START);
  const t = msg.indexOf('¶', w);
  const tape = msg.slice(w + 1, t);
  const keys: string[] = []; const values: string[] = [];
  const seen = new Set<string>(); let ck = ''; let cv = '';
  for (const ch of tape) {
    if (ch.charCodeAt(0) > 0x370 && !seen.has(ch)) { if (ck !== '') { keys.push(ck); values.push(cv); } seen.add(ch); ck = ch; cv = ''; }
    else cv += ch;
  }
  if (ck !== '') { keys.push(ck); values.push(cv); }
  return { keys, values, body: msg.slice(t + 1), contract: msg.slice(0, w) };
}
let gInterior = 0, gPrefix = 0, gSuffix = 0, gBoth = 0, gRules = 0, gUnusedEarlier = 0;
for (const r of plan) {
  const text = fs.readFileSync(r.path, 'utf8');
  const R: any = tagstackEncode(text, enc);
  const tp = parseTape(String(R.message));
  const { keys, values } = tp;
  let interior = 0, prefix = 0, suffix = 0, unusedEarlier = 0;
  // index values by content for the interior scan
  for (let i = 0; i < values.length; i++) {
    const vi = values[i];
    for (let j = 0; j < values.length; j++) {
      if (i === j) continue;
      const vj = values[j];
      if (vj.length < 2 || !vi.includes(vj)) continue;
      const isPre = vi.startsWith(vj);
      const isSuf = vi.endsWith(vj);
      if (j < i) { if (!isPre && !isSuf) unusedEarlier++; continue; }   // j later: ΠΡΟΟΙΜΙΟΝ cannot use it
      if (isPre) prefix++;
      else if (isSuf) suffix++;
      else interior++;
    }
  }
  gInterior += interior; gPrefix += prefix; gSuffix += suffix; gRules += values.length; gUnusedEarlier += unusedEarlier;
  console.log(`${r.lane.padEnd(22)} rules=${String(values.length).padStart(4)}  interiorLater=${String(interior).padStart(4)}  preLater=${String(prefix).padStart(3)} sufLater=${String(suffix).padStart(3)}  interiorEarlierUNUSED=${String(unusedEarlier).padStart(4)}`);
}
console.log(`\nTOTALS over 29 lanes: rules ${gRules}, interior-factor-with-j-later ${gInterior}, prefix ${gPrefix}, suffix ${gSuffix}, interior-earlier-not-used-by-ΠΡΟΟΙΜΙΟΝ ${gUnusedEarlier}`);
console.log(`ΓΕΝΝΑΔΑΣ control population (prefix/suffix, j later): ${gPrefix + gSuffix}`);
fs.writeFileSync('bench/x103/receipts/pop.json', JSON.stringify({ note: 'X103 population census: rules whose value contains another rule value, split by position and prefix/suffix/interior', rules: gRules, interiorLater: gInterior, prefixLater: gPrefix, suffixLater: gSuffix, interiorEarlierUnused: gUnusedEarlier }, null, 1));
