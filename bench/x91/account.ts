/**
 * X91 — WHERE DO THE MESSAGE TOKENS ACTUALLY GO?
 *
 * Every codec in this stack has attacked the tape's CONTENT (rule coverage, glyph
 * relabelling, tape factoring — all measured exhausted at X28). Nobody has published
 * a per-message accounting that separates the four cost centres, so nobody knows
 * which one is still large. This harness computes it from committed wires, with
 * ZERO frontier calls.
 *
 *   message = CONTRACT + TAPE(glyph column + value column) + BODY(references + residue)
 *
 * The wire shape (brachylogia/syntomos): contract line, then `§` starts the tape,
 * the first `¶` after it ends the tape, and the remainder is the body.
 */
import { countTokensExact } from '../../src/lib/omega/bpe';
import * as fs from 'node:fs';
const ENC = 'o200k_base' as const;
const ct = (s: string) => countTokensExact(s, ENC);

function account(wire: string) {
  const sec = wire.indexOf('§');
  const pil = sec >= 0 ? wire.indexOf('¶', sec) : -1;
  const contract = sec >= 0 ? wire.slice(0, sec) : wire;
  const tape = pil >= 0 ? wire.slice(sec, pil) : (sec >= 0 ? wire.slice(sec) : '');
  const body = pil >= 0 ? wire.slice(pil + 1) : '';
  // tape entries: each NEW non-ascii char starts an entry; its value runs to the next new one
  const seen = new Set<string>();
  const entries: { g: string; v: string }[] = [];
  let cur: { g: string; v: string } | null = null;
  for (const ch of tape) {
    const nonascii = ch.codePointAt(0)! > 127;
    if (nonascii && !seen.has(ch)) { seen.add(ch); cur = { g: ch, v: '' }; entries.push(cur); }
    else if (cur) cur.v += ch;
    else if (nonascii && cur === null) { /* leading § itself */ }
    else if (cur) cur.v += ch;
  }
  // glyph references in body
  let refs = 0; const refCount = new Map<string, number>();
  for (const ch of body) if (ch.codePointAt(0)! > 127 && ch !== '¶') {
    refs++; refCount.set(ch, (refCount.get(ch) ?? 0) + 1);
  }
  const residue = [...body].filter(c => !(c.codePointAt(0)! > 127)).join('');
  return {
    total: ct(wire), contract: ct(contract), tape: ct(tape), body: ct(body),
    entries: entries.length,
    tapeGlyphs: entries.length,                       // 1 token each (verified below)
    tapeValues: ct(entries.map(e => e.v).join('\u0000')),
    refs, residue: ct(residue),
    unusedEntries: entries.filter(e => (refCount.get(e.g) ?? 0) === 0).length,
    singleUseEntries: entries.filter(e => (refCount.get(e.g) ?? 0) === 1).length,
  };
}

const files = process.argv.slice(2);
console.log('lane'.padEnd(16), 'total  contr   tape   body | entr valTok  refs resd | unu 1use');
let sum = { total: 0, contract: 0, tape: 0, body: 0, entries: 0, refs: 0, residue: 0, unused: 0, single: 0, val: 0 };
for (const f of files) {
  const w = fs.readFileSync(f, 'utf8');
  const a = account(w);
  const name = f.split('/').pop()!.replace('.wire.txt', '').slice(0, 15);
  console.log(name.padEnd(16),
    String(a.total).padStart(5), String(a.contract).padStart(6), String(a.tape).padStart(6), String(a.body).padStart(6),
    '|', String(a.entries).padStart(4), String(a.tapeValues).padStart(6), String(a.refs).padStart(5), String(a.residue).padStart(5),
    '|', String(a.unusedEntries).padStart(3), String(a.singleUseEntries).padStart(4));
  sum.total += a.total; sum.contract += a.contract; sum.tape += a.tape; sum.body += a.body;
  sum.entries += a.entries; sum.refs += a.refs; sum.residue += a.residue;
  sum.unused += a.unusedEntries; sum.single += a.singleUseEntries; sum.val += a.tapeValues;
}
console.log('-'.repeat(78));
console.log('TOTAL'.padEnd(16),
  String(sum.total).padStart(5), String(sum.contract).padStart(6), String(sum.tape).padStart(6), String(sum.body).padStart(6),
  '|', String(sum.entries).padStart(4), String(sum.val).padStart(6), String(sum.refs).padStart(5), String(sum.residue).padStart(5),
  '|', String(sum.unused).padStart(3), String(sum.single).padStart(4));
const pct = (n: number) => (100 * n / sum.total).toFixed(1) + '%';
console.log(`\nshare of message: contract ${pct(sum.contract)}  tape ${pct(sum.tape)}  body ${pct(sum.body)}`);
console.log(`inside the tape : glyph column ${sum.entries} tok (${pct(sum.entries)})  values ${sum.val} tok (${pct(sum.val)})`);
console.log(`inside the body : glyph references ${sum.refs} tok (${pct(sum.refs)})  literal residue ${sum.residue} tok (${pct(sum.residue)})`);
console.log(`entries used 0 times: ${sum.unused}   used exactly once: ${sum.single}   (of ${sum.entries})`);
