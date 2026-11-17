/**
 * bench/x125/respell.ts — X125 probe, ZERO encoder calls.
 *
 * QUESTION. The CHIRON wire names its rules with code points drawn from one
 * glyph script. `chironEncode` picks that script by counting payload collisions
 * and taking the minimum (chiron.ts:1637) — a proxy, never a price. Is the price
 * of the SAME grammar materially different when it is spelled in a different
 * script?
 *
 * METHOD. Take each shipped frontier wire, parse its tape into (glyph, value)
 * rules, and re-spell every glyph — in the tape values and in the body — with
 * the i-th character of another script's pool. The grammar is bit-identical and
 * so is the decoded text; only the spelling changes. Re-price the complete
 * message (the contract names the script, so the contract changes too), and
 * report the delta.
 *
 * This separates the two things a script controls:
 *   CAPACITY  -- how many rules the pool can name at all (cyrillic 122,
 *                polyglot 799, cjk 2515, hangul 677 ...)
 *   DENSITY   -- how often two adjacent glyphs merge into ONE token
 *                (cyrillic 823 merge pairs over 122 chars = 5.5 % of pairs,
 *                 polyglot 3413 over 799 = 0.53 %, cjk 2400 over 2515 = 0.04 %)
 * and prices the second one without re-running the search.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import {
  chironParseTape, chironOpsUsed, chironDecoderPrompt, CHIRON_SCRIPTS,
  CHIRON_START, CHIRON_SEP, type ChironScript,
} from '../../src/lib/omega/chiron';
import { scriptPool } from '../../src/lib/omega/ariadne';

const enc = 'o200k_base' as const;
const rows = fs.readFileSync('bench/x124/receipts/steli-ab-messages.jsonl', 'utf8')
  .split('\n').filter(Boolean).map((l) => JSON.parse(l));

function scriptOfWire(wire: string): ChironScript | null {
  const i = wire.indexOf(CHIRON_START);
  if (i < 0) return null;
  const cut = wire.indexOf(CHIRON_SEP, i + 1);
  if (cut < 0) return null;
  const tape = wire.slice(i + 1, cut);
  if (!tape.length) return null;
  return chironOpsUsed(wire.slice(i)).script ?? null;
}

/** Simultaneous character substitution (sequential replacement would cascade). */
function remap(s: string, map: Map<string, string>): string {
  let out = '';
  for (const ch of s) out += map.get(ch) ?? ch;
  return out;
}

console.log('lane                        rules  ' + CHIRON_SCRIPTS.map((s) => s.name.slice(0, 7).padStart(8)).join(''));
const totals = new Map<string, number>();
for (const s of CHIRON_SCRIPTS) totals.set(s.name, 0);
let base = 0;

for (const r of rows) {
  const msg: string = r.message;
  const i = msg.indexOf(CHIRON_START);
  if (i < 0) { console.log(`${r.path.split('/').pop()!.padEnd(26)} (no frame)`); continue; }
  const cut = msg.indexOf(CHIRON_SEP, i + 1);
  if (cut < 0) { console.log(`${r.path.split('/').pop()!.padEnd(26)} (no sep)`); continue; }
  const srcScript = scriptOfWire(msg);
  if (!srcScript) { console.log(`${r.path.split('/').pop()!.padEnd(26)} (no script)`); continue; }
  const tape = msg.slice(i + 1, cut);
  const body = msg.slice(cut + 1);
  const rules = chironParseTape(tape, srcScript);
  if (!rules || !rules.length) { console.log(`${r.path.split('/').pop()!.padEnd(26)} (no rules)`); continue; }

  const glyphs = rules.map((x) => x.glyph);
  const glyphSet = new Set(glyphs);
  const payload = new Set<string>();
  for (const ch of body) if (!glyphSet.has(ch)) payload.add(ch);

  const wire0 = msg.slice(i);
  const baseMsg = chironDecoderPrompt(wire0);
  const baseTok = countTokens(baseMsg, enc);
  base += baseTok;

  const cells: string[] = [];
  for (const target of CHIRON_SCRIPTS) {
    const pool = scriptPool(target, enc).chars.filter((c) => !payload.has(c));
    if (pool.length < rules.length) { cells.push('     --'); continue; }
    const map = new Map<string, string>();
    rules.forEach((x, k) => map.set(x.glyph, pool[k]!));
    // the rule values and the body both reference glyphs; remap both at once
    const tape2 = rules.map((x, k) => pool[k]! + remap(x.raw, map)).join('');
    const body2 = remap(body, map);
    const wire2 = CHIRON_START + tape2 + CHIRON_SEP + body2;
    // the re-spelled wire must decode to exactly the same text
    const tok = countTokens(chironDecoderPrompt(wire2), enc);
    const d = tok - baseTok;
    totals.set(target.name, totals.get(target.name)! + tok);
    cells.push((d === 0 ? '      .' : (d > 0 ? '+' : '') + String(d)).padStart(8));
  }
  console.log(`${r.path.split('/').pop()!.padEnd(26)} ${String(rules.length).padStart(5)}  ${cells.join('')}`);
}

console.log('');
console.log('Σ complete messages (contract re-generated per script; BASE = as shipped):');
console.log(`  BASE    ${base}`);
for (const s of CHIRON_SCRIPTS) {
  const t = totals.get(s.name)!;
  console.log(`  ${s.name.padEnd(9)} ${t}  (Δ ${t - base})`);
}
console.log('');
console.log('label token costs (the contract names the script):');
for (const s of CHIRON_SCRIPTS) {
  const cl = `Every new ${s.label} before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result.`;
  console.log(`  ${s.name.padEnd(9)} ${countTokens(cl, enc)}  ${s.label}`);
}
