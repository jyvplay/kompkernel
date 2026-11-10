/**
 * X99 — ΓΛΩΣΣΑ (glossa, "tongue/alphabet"): THE SCRIPT IS A FREE PARAMETER NO CODEC HAS TOUCHED.
 *
 * ΧΕΙΡΟΝ declares the tape's alphabet by the FIRST letter's codepoint range, so switching scripts
 * costs nothing to transmit.  ἸΣΟΜΟΡΦΊΑ relabels letters WITHIN the declared script (measured 0).
 * NOTHING in the stack changes WHICH script.  And the script is not cosmetic: it fixes the
 * codepoint range of every key, hence every fusion boundary in the tape.
 *
 * vocab.ts priced same-script fusion (cyrillic 823 two-char / 1 896 three-char, polyglot 3 417 /
 * 3 399, cjk 2 408 / 388, ...).  What was never priced is the boundary that actually occurs in a
 * tape with literal values: ASCII <-> script.  This measures, per script, how many 2-character
 * vocabulary tokens exist of the form
 *     (printable ASCII, script char)   and   (script char, printable ASCII)
 * and how many of the tape's actual boundaries are of each form.
 */
import * as fs from 'node:fs';
import { decodeIds } from '../../src/lib/omega/bpe';
import { CHIRON_SCRIPTS, CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';
const inSc = (cp: number, ranges: Array<[number, number]>): boolean => { for (const [a, b] of ranges) if (cp >= a && cp < b) return true; return false; };
const isA = (cp: number): boolean => cp >= 0x20 && cp < 0x7F;

// per-script counts of cross-boundary 2-char vocabulary tokens
const cnt = new Map<string, { as: number; sa: number }>();
for (const s of CHIRON_SCRIPTS) cnt.set(s.name, { as: 0, sa: 0 });
for (let id = 0; id < 200007; id++) {
  let t: string; try { t = decodeIds([id], enc); } catch { continue; }
  const c = [...t].map(x => x.codePointAt(0)!);
  if (c.length !== 2) continue;
  for (const s of CHIRON_SCRIPTS) {
    const r = s.ranges ?? [[s.lo, s.hi]];
    if (isA(c[0]) && inSc(c[1], r)) cnt.get(s.name)!.as++;
    if (inSc(c[0], r) && isA(c[1])) cnt.get(s.name)!.sa++;
  }
}
console.log(`${'script'.padEnd(12)} ${'ASCII+script'.padStart(13)} ${'script+ASCII'.padStart(13)}   (2-char vocabulary tokens crossing the boundary)`);
for (const [k, v] of cnt) console.log(`${k.padEnd(12)} ${String(v.as).padStart(13)} ${String(v.sa).padStart(13)}`);

// how many of the tapes' actual boundaries are of each form
let totAsciiScript = 0, totScriptAscii = 0, totScriptScript = 0, totAsciiAscii = 0;
const perLane: any[] = [];
for (const f of fs.readdirSync('bench/x87/receipts/wires').sort()) {
  const msg = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const w = msg.indexOf(CHIRON_START), t = msg.indexOf(CHIRON_SEP, w);
  const tape = msg.slice(w + 1, t);
  const first = tape.codePointAt(0)!;
  const sc = CHIRON_SCRIPTS.find(s => inSc(first, s.ranges ?? [[s.lo, s.hi]]));
  const r = sc ? (sc.ranges ?? [[sc.lo, sc.hi]]) : [];
  let a = 0, b = 0, c2 = 0, d = 0;
  for (let i = 0; i + 1 < tape.length; i++) {
    const x = tape.codePointAt(i)!, y = tape.codePointAt(i + 1)!;
    if (isA(x) && inSc(y, r)) a++; else if (inSc(x, r) && isA(y)) b++; else if (inSc(x, r) && inSc(y, r)) c2++; else if (isA(x) && isA(y)) d++;
  }
  totAsciiScript += a; totScriptAscii += b; totScriptScript += c2; totAsciiAscii += d;
  perLane.push({ lane: f, script: sc?.name ?? '?', asciiScript: a, scriptAscii: b, scriptScript: c2, asciiAscii: d });
}
console.log(`\n${'lane'.padEnd(20)} ${'script'.padStart(10)} ${'A->S'.padStart(6)} ${'S->A'.padStart(6)} ${'S->S'.padStart(6)} ${'A->A'.padStart(6)}`);
for (const p of perLane) console.log(`${p.lane.padEnd(20)} ${p.script.padStart(10)} ${String(p.asciiScript).padStart(6)} ${String(p.scriptAscii).padStart(6)} ${String(p.scriptScript).padStart(6)} ${String(p.asciiAscii).padStart(6)}`);
console.log(`\nTOTAL boundaries in the ten tapes: ASCII->script ${totAsciiScript}, script->ASCII ${totScriptAscii}, script->script ${totScriptScript}, ASCII->ASCII ${totAsciiAscii}`);
fs.writeFileSync('bench/x97/receipts/glossa.json', JSON.stringify({ cross: Object.fromEntries(cnt), perLane, totals: { asciiScript: totAsciiScript, scriptAscii: totScriptAscii, scriptScript: totScriptScript, asciiAscii: totAsciiAscii } }, null, 1));
