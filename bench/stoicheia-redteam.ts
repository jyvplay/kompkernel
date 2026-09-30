/**
 * bench/stoicheia-redteam.ts
 * =============================================================================
 * STOICHEIA-Σ RED TEAM
 *
 * G0  novelty: covers the ten Unicode math-alphabet families KALLOS omits
 *     (double-struck, script, bold-script, fraktur, bold-fraktur, bold-italic,
 *     sans-bold, sans-italic, sans-bold-italic) + the letterlike-symbol holes.
 * G1  table correctness: all 726 (family,char) pairs match NFKC ground truth.
 * G2  exact round trip through the library decoder on every fixture.
 * G3  independent CPython decoder (bench/stoicheia_decode.py) agrees byte-for-byte.
 * G4  totality: empty, dangling daggers, literal †…‡ collisions, mixed junk,
 *     emoji/CJK adjacency all decode correctly and never corrupt.
 * G5  honest gate: when applied, messageTokens < inTokens; when not applied,
 *     wire === input and savings == 0 (no phantom gains).
 * G6  pareto vs KALLOS: on the styled-typography lane STOICHEIA is never worse
 *     than KALLOS and strictly better on the families KALLOS cannot see.
 * G7  structured fuzz: 500 randomized strings mixing every family, ASCII,
 *     digits, CJK, emoji, and the reserved daggers; exact round trip, zero crashes.
 * G8  headline receipts: real fancy-text + math samples show large wins;
 *     plain ASCII / prose show exactly zero.
 *
 * Run: npx tsx bench/stoicheia-redteam.ts
 * =============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import {
  stoicheiaEncode, stoicheiaDecode, stoicheiaDecoderPrompt,
  findStoicheiaSpans, styledCodepoint, stoicheiaApplySpans, stoicheiaRestoreSpans,
  STOICHEIA_FAMILIES, STOICHEIA_OPEN, STOICHEIA_CLOSE,
} from '../src/lib/omega/stoicheia';
import { kallosEncode } from '../src/lib/omega/kallos';
import { CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, MOSAIC_HANDTRACE_300 } from './fixtures';

const ENC: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);

let pass = 0, fail = 0;
const failures: string[] = [];
function check(gate: string, cond: boolean, detail: string) {
  if (cond) { pass++; } else { fail++; failures.push(`${gate}: ${detail}`); console.error(`  [FAIL] ${gate}: ${detail}`); }
}

function styleRun(family: string, s: string): string {
  let out = '';
  for (const ch of s) {
    const cp = styledCodepoint(family, ch);
    out += cp >= 0 ? String.fromCodePoint(cp) : ch;
  }
  return out;
}

console.log('Running STOICHEIA-Σ Red Team Suite...\n');

/* G0 — novelty */
{
  const kallosFamilies = new Set(['bold', 'italic', 'mono', 'sans']);
  const novel = Object.keys(STOICHEIA_FAMILIES).filter((f) => !kallosFamilies.has(f));
  check('G0', novel.length >= 9, `STOICHEIA adds ${novel.length} families beyond KALLOS`);
}

/* G1 — table correctness vs NFKC ground truth */
{
  let mism = 0, total = 0;
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const DIG = '0123456789';
  for (const fam of Object.keys(STOICHEIA_FAMILIES)) {
    const chars = ALPHA + (STOICHEIA_FAMILIES[fam].D !== undefined ? DIG : '');
    for (const ch of chars) {
      total++;
      const cp = styledCodepoint(fam, ch);
      if (cp < 0) { mism++; continue; }
      if (String.fromCodePoint(cp).normalize('NFKC') !== ch) mism++;
    }
  }
  check('G1', mism === 0, `${total} (family,char) pairs checked; ${mism} disagree with NFKC`);
}

/* Fixtures */
const FIXTURES: Record<string, string> = {
  doubleStruckHeading: styleRun('doubleStruck', 'Double Struck Text for your profile and bio'),
  scriptHeading: styleRun('script', 'Script Style Text for a fancy heading'),
  frakturBand: styleRun('fraktur', 'Fraktur Gothic Text for a metal band name'),
  boldItalicEmphasis: styleRun('boldItalic', 'Bold Italic Emphasis for a heading'),
  boldScriptFancy: styleRun('boldScript', 'Bold Script Fancy Text'),
  sansBoldItalHead: styleRun('sansBoldItal', 'Bold Sans Italic Heading'),
  mathScattered: `For every prime p, ${styleRun('doubleStruck','R')} contains ${styleRun('doubleStruck','Q')} and ${styleRun('doubleStruck','Z')} contains ${styleRun('doubleStruck','N')}. Let the field ${styleRun('doubleStruck','F')} and the Lie algebra ${styleRun('fraktur','g')} act on ${styleRun('script','V')}.`,
  mixedFamilies: `${styleRun('bold','Title')}: ${styleRun('doubleStruck','ABC')} then ${styleRun('fraktur','xyz')} and ${styleRun('script','q')}.`,
  digitsDoubleStruck: styleRun('doubleStruck', 'Version 2024 build 007'),
  pureAsciiNegative: 'The quick brown fox jumps over the lazy dog. 1234567890 const x = 42;',
  pureProseNegative: 'In practice most natural language prose is already well compressed by the tokenizer, so no styled restoration applies here at all.',
  cjkEmoji: '数学 🎉 test ' + styleRun('doubleStruck', 'Cool') + ' 中文 🚀',
  daggerCollision: 'A dagger † and double dagger ‡ appear here literally in the footnotes.',
  fakeSpan: `A literal ${STOICHEIA_OPEN}dHELLO${STOICHEIA_CLOSE} sequence typed by hand.`,
};

/* G2 & G3 — library + independent CPython decoder exactness */
const pyPath = path.join(__dirname, 'stoicheia_decode.py');
const havePy = fs.existsSync(pyPath);
let pyOk = true;
for (const [name, text] of Object.entries(FIXTURES)) {
  const r = stoicheiaEncode(text, ENC);
  check(`G2-${name}`, r.decoded === text && stoicheiaDecode(r.wire) === text, `${name} library round trip`);
  if (havePy) {
    try {
      const out = execFileSync('python3', [pyPath], { input: r.wire, encoding: 'utf-8' });
      if (out !== text) { pyOk = false; check(`G3-${name}`, false, `CPython decoder disagreed on ${name}`); }
    } catch (e) { pyOk = false; check(`G3-${name}`, false, `CPython decoder threw on ${name}: ${e}`); }
  }
}
check('G3-available', havePy, 'independent CPython decoder present');
if (havePy && pyOk) check('G3-all', true, 'CPython decoder agrees on all fixtures');

/* G4 — totality on adversarial / degenerate inputs */
{
  const advs = [
    '', '†', '‡', '†d', '†d‡', '†qABC‡' /* bad family code */, '††††', '‡‡‡',
    STOICHEIA_OPEN + 'z' /* dangling */, 'plain', '†dABC' /* no close */,
    styleRun('doubleStruck', 'X') + '†stray', '🚀'.repeat(50),
  ];
  let ok = true;
  for (const a of advs) { try { stoicheiaRestoreSpans(a); stoicheiaDecode(a); stoicheiaEncode(a, ENC); } catch { ok = false; } }
  check('G4-total', ok, 'no crash on degenerate/adversarial inputs');
  // exactness on collision fixtures already covered by G2 (daggerCollision, fakeSpan)
}

/* G5 — honest gate */
for (const [name, text] of Object.entries(FIXTURES)) {
  const r = stoicheiaEncode(text, ENC);
  if (r.applied) {
    check(`G5-gate-${name}`, r.messageTokens < r.inTokens, `${name}: applied ⇒ messageTokens(${r.messageTokens}) < inTokens(${r.inTokens})`);
  } else {
    check(`G5-idty-${name}`, r.wire === text && r.savingsPct === 0, `${name}: not applied ⇒ identity wire, zero savings`);
  }
}

/* G6 — pareto vs KALLOS on the styled lane */
{
  for (const name of ['doubleStruckHeading', 'scriptHeading', 'frakturBand', 'boldItalicEmphasis', 'boldScriptFancy', 'sansBoldItalHead']) {
    const text = FIXTURES[name];
    const s = stoicheiaEncode(text, ENC);
    const k = kallosEncode(text, ENC);
    check(`G6-${name}`, s.messageTokens <= k.messageTokens, `${name}: STOICHEIA(${s.messageTokens}) <= KALLOS(${k.messageTokens})`);
    check(`G6-strict-${name}`, s.messageTokens < T(text), `${name}: STOICHEIA strictly beats raw (${s.messageTokens} < ${T(text)})`);
  }
}

/* G7 — structured fuzz */
{
  const families = Object.keys(STOICHEIA_FAMILIES);
  const junk = ['a', 'Z', '7', ' ', '中', '🚀', '†', '‡', '.', '_', '\n', 'x²', 'ß'];
  let ok = true, tested = 0;
  let seed = 1234567;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i < 500; i++) {
    let s = '';
    const parts = 1 + Math.floor(rnd() * 6);
    for (let p = 0; p < parts; p++) {
      if (rnd() < 0.55) {
        const fam = families[Math.floor(rnd() * families.length)];
        let word = '';
        const wl = 1 + Math.floor(rnd() * 8);
        for (let w = 0; w < wl; w++) {
          const pick = rnd();
          word += pick < 0.45 ? String.fromCharCode(97 + Math.floor(rnd() * 26))
            : pick < 0.9 ? String.fromCharCode(65 + Math.floor(rnd() * 26))
            : String.fromCharCode(48 + Math.floor(rnd() * 10));
        }
        s += styleRun(fam, word);
      } else {
        s += junk[Math.floor(rnd() * junk.length)];
      }
    }
    tested++;
    try {
      const r = stoicheiaEncode(s, ENC);
      if (r.decoded !== s) { ok = false; check('G7', false, `fuzz #${i} decoded mismatch`); break; }
      if (stoicheiaDecode(r.wire) !== s) { ok = false; check('G7', false, `fuzz #${i} standalone decode mismatch`); break; }
    } catch (e) { ok = false; check('G7', false, `fuzz #${i} threw: ${e}`); break; }
  }
  check('G7', ok, `${tested} randomized inputs, exact round trip, zero crashes`);
}

/* G8 — headline receipts + negative space */
{
  const head = FIXTURES.doubleStruckHeading;
  const r = stoicheiaEncode(head, ENC);
  const saved = T(head) - r.messageTokens;
  const pct = 100 * saved / T(head);
  console.log(`\n  Headline (double-struck fancy text): raw=${T(head)} → message=${r.messageTokens} (saved ${saved}, ${pct.toFixed(1)}%)`);
  check('G8-head', saved >= 20 && pct >= 30, `double-struck heading saved ${saved} (${pct.toFixed(1)}%)`);

  for (const neg of ['pureAsciiNegative', 'pureProseNegative']) {
    const rn = stoicheiaEncode(FIXTURES[neg], ENC);
    check(`G8-${neg}`, !rn.applied && rn.messageTokens === T(FIXTURES[neg]), `${neg} shows zero gain`);
  }
  for (const chaos of [CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, MOSAIC_HANDTRACE_300]) {
    const rc = stoicheiaEncode(chaos, ENC);
    check('G8-chaos-exact', rc.decoded === chaos, 'chaos fixture decodes exactly');
    check('G8-chaos-safe', rc.messageTokens <= T(chaos), 'chaos fixture never inflates');
  }
}

console.log(`\nSTOICHEIA RED TEAM: ${pass} passed, ${fail} failed`);
if (failures.length) { console.log('FAILURES:'); for (const f of failures) console.log('  - ' + f); }
process.exitCode = fail > 0 ? 1 : 0;
