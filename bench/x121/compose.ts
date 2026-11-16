/**
 * X121 — composition census of the shipped X120 wires.
 * Splits each ON message into contract / tape / body, parses the tape with the
 * repository's own delimiter-free rule, and decomposes the body into
 *   · glyph-reference characters (one per rule use),
 *   · literal characters,
 *   · digits,
 * and reports the o200k_base token density of each. No encoder call.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript } from '../../src/lib/omega/chiron';

const enc = 'o200k_base' as const;
const src = process.argv[2] ?? 'bench/x120/receipts/ab-messages.jsonl';
const rows = fs.readFileSync(src, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

function scriptOf(cp: number) {
  for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s;
  return null;
}
function parseTape(tape: string) {
  const first = tape.codePointAt(0);
  const script = first === undefined ? null : scriptOf(first);
  if (!script) return null;
  const inScript = (ch: string) => chironInScript(script, ch.codePointAt(0)!);
  const used = new Set<string>();
  const glyphs: string[] = [];
  let i = 0;
  while (i < tape.length) {
    const g = tape[i];
    if (!inScript(g) || used.has(g)) return null;
    used.add(g); glyphs.push(g);
    let j = i + 1;
    while (j < tape.length && !(inScript(tape[j]) && !used.has(tape[j]))) j++;
    i = j;
  }
  return { glyphs, used };
}

const out: any[] = [];
let TOT = { total: 0, body: 0, tape: 0, contract: 0, glyphChars: 0, litChars: 0, digits: 0, bodyNoGlyph: 0, bodyNoDigit: 0 };
for (const r of rows) {
  const m: string = r.message;
  const s = m.indexOf(CHIRON_START);
  const p = s >= 0 ? m.indexOf(CHIRON_SEP, s + 1) : -1;
  if (s < 0 || p < 0) continue;
  const contract = m.slice(0, s), tape = m.slice(s + 1, p), body = m.slice(p + 1);
  const pt = parseTape(tape);
  if (!pt) continue;
  const gset = pt.used;
  let gh = 0, lit = 0, dig = 0;
  let noGlyph = '', noDigit = '';
  for (const ch of body) {
    if (gset.has(ch)) { gh++; } else { noGlyph += ch; lit++; }
    if (ch >= '0' && ch <= '9') dig++; else noDigit += ch;
  }
  const B = countTokens(body, enc);
  const B0 = countTokens(noGlyph, enc);
  const BD = countTokens(noDigit, enc);
  const row = {
    path: r.path,
    total: countTokens(m, enc),
    contract: countTokens(contract, enc), tape: countTokens(tape, enc), body: B,
    rules: pt.glyphs.length,
    glyphChars: gh, litChars: lit, digits: dig,
    bodyNoGlyph: B0, bodyNoDigit: BD,
    glyphTok: B - B0, litTok: B0,
    densGlyph: gh ? +((B - B0) / gh).toFixed(3) : 0,
    densLit: lit ? +(B0 / lit).toFixed(3) : 0,
    digitTok: B - BD,
    densDigit: dig ? +((B - BD) / dig).toFixed(3) : 0,
  };
  out.push(row);
  (Object.keys(TOT) as Array<keyof typeof TOT>).forEach((k) => { (TOT as any)[k] += (row as any)[k] ?? 0; });
}
console.log(JSON.stringify(out, null, 1));
console.log('TOTALS', JSON.stringify(TOT));
console.log('glyphTokens/litTokens/digitTokens =', TOT.body - TOT.bodyNoGlyph, TOT.bodyNoGlyph, TOT.body - TOT.bodyNoDigit);
