/**
 * bench/optimal-redteam.ts
 * =============================================================================
 * OPTIMAL ROUTER RED TEAM
 *
 * The "⚡ Route Optimal" button routes a message through the argmin exact codec.
 * This suite audits the routing CORE (evaluateAllCodecsDynamically) + the
 * identity-floor guarantee the UI enforces, on a battery of real input classes.
 *
 * H+  achievability: on inputs with genuine styled-Unicode inflation the router
 *     must select an exact codec that beats identity by a real margin.
 * H-  impossibility: on plain non-repetitive ASCII prose no exact codec can beat
 *     identity — the router must therefore return identity (0% is honest, not a bug).
 * H∂  boundary: the winner is ALWAYS exact and its cost is ALWAYS <= identity.
 *
 * Gates:
 * R1  every codec that reports exact=true actually round-trips byte-for-byte.
 * R2  the router winner is exact.
 * R3  identity floor: winnerTokens <= inputTokens on every input (never inflate).
 * R4  on styled/fancy inputs, winner beats identity by the claimed margin AND
 *     the family that should win (stoicheia/metatron) is at or below identity.
 * R5  on plain prose, winnerTokens == inputTokens (honest floor, no phantom win).
 * R6  determinism: two runs on the same input pick the same winner + tokens.
 *
 * Run: npx tsx bench/optimal-redteam.ts
 * =============================================================================
 */

import { evaluateAllCodecsDynamically } from '../src/lib/omega/codec-synthesis';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { styledCodepoint } from '../src/lib/omega/stoicheia';

const ENC: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);

let pass = 0, fail = 0;
const failures: string[] = [];
function check(gate: string, cond: boolean, detail: string) {
  if (cond) { pass++; } else { fail++; failures.push(`${gate}: ${detail}`); console.error(`  [FAIL] ${gate}: ${detail}`); }
}

function styleRun(fam: string, s: string): string {
  let o = '';
  for (const c of s) { const cp = styledCodepoint(fam, c); o += cp >= 0 ? String.fromCodePoint(cp) : c; }
  return o;
}

// expect: 'win'  = must beat identity via a styled codec.
//         'floor' = must honestly floor to identity (no phantom win).
const INPUTS: Record<string, { text: string; expect: 'win' | 'floor' }> = {
  plainProse: { text: 'In practice most natural language prose is already well handled by the tokenizer, so no exact lossless codec can beat identity here without an inline dictionary that would cost more than it saves.', expect: 'floor' },
  plainCode: { text: 'function add(a, b) { return a + b; } const xs = [1,2,3].map(x => x * 2);', expect: 'floor' },
  doubleStruckFancy: { text: styleRun('doubleStruck', 'Double Struck Text for your profile and bio'), expect: 'win' },
  frakturFancy: { text: styleRun('fraktur', 'Fraktur Gothic Band Name Here Today'), expect: 'win' },
  scriptFancy: { text: styleRun('script', 'Fancy Script Signature Style Heading'), expect: 'win' },
  // H∂ BOUNDARY: a few scattered single styled letters do NOT amortize the inline
  // contract on a short message — the router MUST honestly decline to identity.
  mathScatteredShort: { text: `The reals ${styleRun('doubleStruck','R')} contain ${styleRun('doubleStruck','Q')} and ${styleRun('doubleStruck','Z')}; field ${styleRun('doubleStruck','F')}.`, expect: 'floor' },
};

async function main() {
  console.log('Running OPTIMAL ROUTER Red Team Suite...\n');

  for (const [name, { text, expect }] of Object.entries(INPUTS)) {
    const s = await evaluateAllCodecsDynamically(text, ENC);
    const inTok = T(text);

    // R1 — everyone claiming exact must actually round-trip
    for (const r of s.runs) {
      if (r.exact) check(`R1-${name}-${r.key}`, r.decoded === text, `${r.key} claims exact but decode != input`);
    }

    // The honest delivered winner = min over exact runs, floored by identity.
    const exactRuns = s.runs.filter((r) => r.exact);
    const best = exactRuns.reduce((p, c) => (c.outTokens < p.outTokens ? c : p), exactRuns[0]);
    const delivered = best.outTokens < inTok ? best : { key: 'identity', outTokens: inTok, decoded: text, exact: true };

    // R2 — winner exact
    check(`R2-${name}`, delivered.exact === true && delivered.decoded === text, `router winner (${delivered.key}) must be exact`);

    // R3 — identity floor
    check(`R3-${name}`, delivered.outTokens <= inTok, `winner ${delivered.outTokens} must be <= identity ${inTok}`);

    if (expect === 'win') {
      // R4 — real margin on styled inputs
      const saved = inTok - delivered.outTokens;
      const pct = 100 * saved / inTok;
      console.log(`  ${name}: raw=${inTok} → ${delivered.key}=${delivered.outTokens} (saved ${saved}, ${pct.toFixed(1)}%)`);
      check(`R4-${name}`, saved > 3, `styled input must beat identity by a real margin (saved ${saved})`);
      check(`R4-fam-${name}`, delivered.key === 'stoicheia' || delivered.key === 'metatron', `styled winner should be a styled-alphabet codec, got ${delivered.key}`);
    } else {
      // R5 — honest floor (plain prose, or styled content too sparse to amortize)
      console.log(`  ${name}: raw=${inTok} → ${delivered.key}=${delivered.outTokens} (floor)`);
      check(`R5-${name}`, delivered.outTokens === inTok && delivered.key === 'identity', `input must floor to identity (got ${delivered.key} @ ${delivered.outTokens})`);
    }

    // R6 — determinism
    const s2 = await evaluateAllCodecsDynamically(text, ENC);
    const best2 = s2.runs.filter((r) => r.exact).reduce((p, c) => (c.outTokens < p.outTokens ? c : p), s2.runs[0]);
    check(`R6-${name}`, best2.key === best.key && best2.outTokens === best.outTokens, `nondeterministic winner: ${best.key}/${best.outTokens} vs ${best2.key}/${best2.outTokens}`);
  }

  console.log(`\nOPTIMAL ROUTER RED TEAM: ${pass} passed, ${fail} failed`);
  if (failures.length) { console.log('FAILURES:'); for (const f of failures) console.log('  - ' + f); }
  process.exitCode = fail > 0 ? 1 : 0;
}

main();
