/**
 * X42 screen 2 — is APOCOPE sound and worth a full encode?
 * For every lane: chosen templates, rendered clause, clause token cost,
 * raw digit saving, and an exact round-trip check.
 * Cheap: no stack encode.
 */
import { readFileSync, existsSync } from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import {
  apocopeChoose, apocopeApply, apocopeUndo, apocopeClauseFor, apocopeRender,
} from '@/lib/omega/apocope';

const enc = (process.env.ENC || 'o200k_base') as EncodingName;
const lanes = (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean);
const dirs = ['bench/holdout', 'bench/holdout-tab', 'bench/holdout-ops', 'bench/holdout-work',
  'bench/holdout-mk', 'bench/x30/fresh'];

let totRaw = 0, totClause = 0;
for (const name of lanes) {
  let p = existsSync(name) ? name : '';
  if (!p) for (const d of dirs) { const q = `${d}/${name}.txt`; if (existsSync(q)) { p = q; break; } }
  if (!p) { console.log(`${name.padEnd(40)} MISSING`); continue; }
  const text = readFileSync(p, 'utf8');
  const ch = apocopeChoose(text, enc);
  const raw = ch.reduce((s, t) => s + t.save, 0);
  if (raw < 20) { console.log(`${name.padEnd(40)} (none)`); continue; }

  const cut = apocopeApply(text, ch);
  const back = apocopeUndo(cut, ch);
  const rt = back === text ? 'RT-ok ' : 'RT-FAIL';
  const clause = apocopeClauseFor(ch);
  const ct = countTokens(' ' + clause + ' print only.', enc) - countTokens(' print only.', enc);
  const shrunk = text.length - cut.length;
  totRaw += raw; totClause += ct;
  console.log(`${name.padEnd(40)} raw=${String(raw).padStart(5)} chars=${String(shrunk).padStart(5)} clause=${String(ct).padStart(3)}tok ${rt}`);
  for (const t of ch) {
    console.log(`    keep=${t.keep} n=${String(t.count).padStart(4)} ${apocopeRender(t).padEnd(20)} save=${String(t.save).padStart(4)}  e.g. ${t.prefix}[${String(t.sample.slice(t.prefix.length, t.sample.length - t.suffix.length))}]${t.suffix}`);
  }
}
console.log(`\nTOTAL raw=${totRaw} clause=${totClause}`);
