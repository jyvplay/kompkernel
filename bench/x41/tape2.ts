/**
 * X41 — WHAT IS ACTUALLY IN THE TAPE?
 *
 * X40 ended with a number it could not use: on the ops lanes the CHIRON rule
 * tape is 63–84 % of the shipped one-chat message, and the payload is nearly
 * all glyphs. This bench takes the real wire apart and measures the tape's
 * internal structure, because a mechanism that shrinks the tape is the only
 * thing that can move those lanes.
 *
 * For each lane it prints:
 *   contract / tape / body tokens;
 *   one row per RULE: its length in tokens, its length in characters, whether
 *   it is an operator rule (× or …) or literal, and how many characters of its
 *   body are shared as a PREFIX with the previous rule in TAPE ORDER.
 *
 * The prefix number is the empirical test of front coding: if rule bodies were
 * sorted, prefix sharing would be large. In tape order (discovery order) it is
 * whatever the search happened to produce.
 */
import * as fs from 'node:fs';
import { ouraEncode } from '@/lib/omega/oura';
import { countTokens, tokenStrings } from '@/lib/omega/bpe';
import { chironInScript, CHIRON_SCRIPTS, CHIRON_SEP, CHIRON_REP, CHIRON_LIST } from '@/lib/omega/chiron';

const enc: any = 'o200k_base';

function splitWire(wire: string) {
  if (!wire.startsWith('§')) return { tape: '', body: wire, rules: [] as string[] };
  const cut = wire.indexOf(CHIRON_SEP);
  const tape = wire.slice(1, cut);
  const body = wire.slice(cut + 1);
  // first char declares the script
  const cp0 = tape.codePointAt(0)!;
  const script = CHIRON_SCRIPTS.find((s) => chironInScript(s, cp0));
  const rules: string[] = [];
  if (script) {
    let cur = '';
    let started = false;
    for (const ch of tape) {
      const cp = ch.codePointAt(0)!;
      if (chironInScript(script, cp) && (!started || cur.length)) {
        if (started) rules.push(cur);
        cur = ch; started = true;
      } else if (started) cur += ch;
    }
    if (started) rules.push(cur);
    // the first element is just the script declaration letter
    if (rules.length && rules[0].length === 1) rules.shift();
  }
  return { tape, body, rules };
}

const lanes = (process.env.LANES || '').split(',').filter(Boolean);
for (const p of lanes) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const r: any = ouraEncode(t, enc);
  const ms = Date.now() - t0;
  const { tape, body, rules } = splitWire(r.wire);
  const contractTok = countTokens(r.contract || '', enc);
  const tapeTok = countTokens(tape, enc);
  const bodyTok = countTokens(body, enc);
  const ruleTok = rules.map((x) => countTokens(x, enc));
  const total = ruleTok.reduce((a, b) => a + b, 0);
  // prefix sharing in TAPE order
  let shareOrder = 0, shareSorted = 0;
  for (let i = 1; i < rules.length; i++) {
    let k = 0;
    while (k < rules[i].length - 1 && k < rules[i - 1].length - 1 && rules[i][1 + k] === rules[i - 1][1 + k]) k++;
    shareOrder += k;
  }
  const sorted = [...rules].sort();
  for (let i = 1; i < sorted.length; i++) {
    let k = 0;
    while (k < sorted[i].length - 1 && k < sorted[i - 1].length - 1 && sorted[i][1 + k] === sorted[i - 1][1 + k]) k++;
    shareSorted += k;
  }
  const opRules = rules.filter((x) => x.includes(CHIRON_REP) || x.includes(CHIRON_LIST)).length;
  console.log(`\n=== ${p.split('/').pop()}  M=${r.messageTokens}  contract=${contractTok} tape=${tapeTok} body=${bodyTok}  rules=${rules.length} (${opRules} op)  ${(ms / 1000).toFixed(0)}s`);
  console.log(`    tape chars=${tape.length}  tokens/rule=${(total / Math.max(1, rules.length)).toFixed(2)}  ruleTok=${total}`);
  console.log(`    prefix chars shared: tape order ${shareOrder}, sorted ${shareSorted}`);
  const byLen = [...rules].sort((a, b) => countTokens(b, enc) - countTokens(a, enc)).slice(0, 12);
  for (const x of byLen) {
    const tk = countTokens(x, enc);
    const digits = (x.match(/\d+/g) || []).length;
    console.log(`      ${String(tk).padStart(3)}tok ${String(x.length).padStart(4)}ch d=${digits} ${JSON.stringify(x.slice(0, 90))}`);
  }
  const hist = new Map<number, number>();
  for (const n of ruleTok) hist.set(n, (hist.get(n) || 0) + 1);
  console.log('    rule-length histogram (tok:count):', [...hist.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join(' '));
}
