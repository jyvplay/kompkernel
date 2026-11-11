/**
 * X103 — POPULATION CENSUS 2: BODY LITERALS THAT ALREADY HAVE A RULE.
 *
 * What exists in the stack:
 *   ΧΕΙΡΩΝ's induction replaces body occurrences of a rule's value with the rule's key, but the
 *     induction is gated on the SHARED WORK METER, which is 96 % exhausted on ls-l-real, 75 % on
 *     ps-aux-real, 73 % on code-ts (bench/x101/klimax29.json).
 *   ΠΡΟΟΙΜΙΟΝ's re-spelling sweep iterates `for (let i = 0; i < tp.keys.length; i++)` — it
 *     re-spells TAPE VALUES ONLY.  The body is never re-examined after ΧΕΙΡΩΝ finishes.
 *   ΔΙΑΓΡΑΦΗ deletes rules; it never adds a body reference.
 *   ⇒ if a rule's expanded value still occurs LITERALLY in the body, no codec in the stack will
 *     ever reference it, and the loss is (tokens(literal) − 1) per occurrence, for free.
 *
 * CONTROL: the same census restricted to occurrences that ΧΕΙΡΩΝ ALREADY references (a body key
 * glyph), which must be reported too — otherwise a large literal count could be an artefact of a
 * parser that failed to recognise existing references.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START } from '../../src/lib/omega/chiron';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const plan = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runK.json', 'utf8')).rows as any[];
function parseTape(msg: string) {
  const w = msg.indexOf(CHIRON_START); const t = msg.indexOf('¶', w);
  const tape = msg.slice(w + 1, t);
  const keys: string[] = []; const values: string[] = [];
  const seen = new Set<string>(); let ck = ''; let cv = '';
  for (const ch of tape) {
    if (ch.charCodeAt(0) > 0x370 && !seen.has(ch)) { if (ck !== '') { keys.push(ck); values.push(cv); } seen.add(ch); ck = ch; cv = ''; }
    else cv += ch;
  }
  if (ck !== '') { keys.push(ck); values.push(cv); }
  return { keys, values, body: msg.slice(t + 1) };
}
function expand(keys: string[], values: string[]): string[] {
  const at = new Map<string, number>();
  keys.forEach((k, i) => at.set(k, i));
  const out: string[] = [];
  for (let i = 0; i < values.length; i++) {
    let s = ''; let lit = '';
    for (const ch of values[i]) {
      const j = at.get(ch);
      if (j !== undefined && j < i) { s += lit + out[j]; lit = ''; } else lit += ch;
    }
    out.push(s + lit);
  }
  return out;
}
let gLit = 0, gRef = 0, gSave = 0, gLanes = 0, gLanesWithLit = 0;
const rows: any[] = [];
for (const r of plan) {
  const text = fs.readFileSync(r.path, 'utf8');
  const R: any = tagstackEncode(text, enc);
  const tp = parseTape(String(R.message));
  if (!tp.keys.length) { rows.push({ lane: r.lane, rules: 0, literalOccurrences: 0, referencedOccurrences: 0, estSave: 0 }); continue; }
  const exp = expand(tp.keys, tp.values);
  let lit = 0, ref = 0, save = 0; const hits: string[] = [];
  for (let i = 0; i < tp.keys.length; i++) {
    const v = exp[i];
    if (v.length < 2) continue;
    const costV = countTokens(v, enc);
    // count occurrences of v in the body that are not already the key glyph
    let from = 0; let n = 0;
    for (;;) {
      const p = tp.body.indexOf(v, from);
      if (p < 0) break;
      n++; from = p + 1;
      hits.push(`${tp.keys[i]}:${v.length}B`);
    }
    if (n > 0) { lit += n; save += n * Math.max(0, costV - 1); }
    // control: how many times the key IS used in the body
    const used = tp.body.split(tp.keys[i]).length - 1;
    ref += used;
  }
  gLit += lit; gRef += ref; gSave += save; gLanes++;
  if (lit > 0) gLanesWithLit++;
  rows.push({ lane: r.lane, rules: tp.keys.length, literalOccurrences: lit, referencedOccurrences: ref, estSave: save, sample: hits.slice(0, 6) });
  console.log(`${r.lane.padEnd(22)} rules=${String(tp.keys.length).padStart(4)}  body-literal-occurrences=${String(lit).padStart(5)}  body-key-occurrences=${String(ref).padStart(5)}  estSave<=${String(save).padStart(5)} tok`);
}
console.log(`\nTOTALS over 29 lanes: body literal occurrences of an existing rule's expanded value = ${gLit} on ${gLanesWithLit} lanes; upper-bound token saving ${gSave}; CONTROL body key occurrences ${gRef}`);
fs.writeFileSync('bench/x103/receipts/bodypop.json', JSON.stringify({ note: 'X103 population census 2: body literals that already have a rule. estSave is an UPPER BOUND (tokens(v)-1 per occurrence, ignoring boundary effects and overlap).', literalOccurrences: gLit, referencedOccurrences: gRef, estSaveUpperBound: gSave, lanesWithLiteral: gLanesWithLit, rows }, null, 1));
