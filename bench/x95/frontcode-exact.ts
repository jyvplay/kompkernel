/**
 * X95/X96 — FRONT CODING THE TAPE'S VALUE COLUMN, PRICED EXACTLY ON THE COMPLETE MESSAGE.
 *
 * THE LEVER. frontcode.ts measured that sorting the tape's 600 values leaves 811 characters of
 * shared prefix between adjacent entries, against 199 tokens to write those prefix lengths as
 * single digits: an upper bound of +114 tokens over the ten committed wires. This probe replaces
 * that density conversion with an exact count on a legal message.
 *
 * WHY THE TAPE MAY BE REORDERED. The tape is positional -- a rule must be defined before its first
 * reference -- but the whole tape precedes the body, so any permutation that preserves each
 * definition's position relative to the values that reference it is legal. A value containing a
 * glyph reference depends on that glyph's entry, so such entries cannot be freely sorted. The
 * construction therefore partitions the entries: values with no glyph reference are sorted by value
 * and front-coded; values that do contain a reference keep their original relative order and follow
 * the sorted block. Every dependency then still points backwards, which the probe asserts.
 *
 * THE ENCODING. An entry is `<glyph><one digit><remainder>`. The digit is the length of the prefix
 * shared with the previous entry's RECONSTRUCTED value, and the remainder is what follows it. The
 * parse is unambiguous because the length occupies exactly one character, so the remainder always
 * begins at a fixed offset regardless of what it contains. A shared prefix longer than nine is
 * capped at nine, which only forgoes saving, never correctness.
 *
 * WHAT IS PRICED. The complete message `contract + 'S' + newTape + 'P' + body` against the shipped
 * wire, exactly. The contract is left untouched, so the delta is the tape alone and any contract tax
 * for describing the scheme is NOT subtracted -- the number below is therefore an upper bound on the
 * arm's value, and the honest arm must also pay for its own description.
 *
 * ZERO frontier calls, zero encodes.
 */
import { countTokensExact, type EncodingName } from '../../src/lib/omega/bpe';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ENC = (process.env.X95_ENC ?? 'o200k_base') as EncodingName;
const ct = (s: string) => countTokensExact(s, ENC);
const SEC = '\u00a7', PIL = '\u00b6';

function parseTape(tape: string): { g: string; v: string }[] {
  const seen = new Set<string>();
  const ents: { g: string; v: string }[] = [];
  let cur: { g: string; v: string } | null = null;
  for (const ch of tape) {
    if (ch.codePointAt(0)! > 127 && !seen.has(ch)) { seen.add(ch); cur = { g: ch, v: '' }; ents.push(cur); }
    else if (cur) cur.v += ch;
  }
  return ents;
}

const files = process.argv.slice(2);
const L: string[] = [];
const receipt: any = { note: 'exact whole-message price of front-coding the tape; zero frontier calls', lanes: [] };
let T = { msg: 0, tape: 0, newTape: 0, pure: 0, mixed: 0 };
L.push('lane'.padEnd(14) + 'msgTok  tapeTok  pure/mixed  newTapeTok  DELTA  dependency-order preserved');
for (const f of files) {
  const wire = fs.readFileSync(f, 'utf8');
  const name = path.basename(f).replace('.wire.txt', '');
  const sec = wire.indexOf(SEC), pil = wire.indexOf(PIL, sec);
  const contract = wire.slice(0, sec), tape = wire.slice(sec + 1, pil), body = wire.slice(pil + 1);
  const ents = parseTape(tape);
  const glyphSet = new Set(ents.map(e => e.g));

  // partition: a value that contains any glyph cannot be freely reordered
  const pure = ents.filter(e => ![...e.v].some(c => glyphSet.has(c)));
  const mixed = ents.filter(e => [...e.v].some(c => glyphSet.has(c)));

  // every glyph a mixed value references must still be defined before it: all PURE entries come
  // first, and MIXED keep their original relative order, so a reference to a PURE glyph is fine and
  // a reference to a MIXED glyph keeps its original relative position.
  const pureIdx = new Map(pure.map((e, i) => [e.g, i]));
  let orderOk = true;
  {
    const seenG = new Set<string>(pure.map(e => e.g));
    for (const e of mixed) {
      for (const c of e.v) if (glyphSet.has(c) && !seenG.has(c)) { orderOk = false; }
      seenG.add(e.g);
    }
  }

  const sortedPure = [...pure].sort((a, b) => (a.v < b.v ? -1 : a.v > b.v ? 1 : 0));
  let newTape = '';
  let prev = '';
  for (const e of sortedPure) {
    let k = 0; while (k < 9 && k < prev.length && k < e.v.length && prev[k] === e.v[k]) k++;
    newTape += e.g + String(k) + e.v.slice(k);
    prev = e.v;
  }
  for (const e of mixed) newTape += e.g + e.v;

  const newMsg = contract + SEC + newTape + PIL + body;
  const delta = ct(newMsg) - ct(wire);
  L.push(name.padEnd(14) + String(ct(wire)).padStart(6) + String(ct(tape)).padStart(9) +
    String(pure.length).padStart(6) + '/' + String(mixed.length).padStart(5) +
    String(ct(newTape)).padStart(13) + String(delta).padStart(7) + String(orderOk).padStart(10));
  receipt.lanes.push({ lane: name, msgTokens: ct(wire), tapeTokens: ct(tape), pureEntries: pure.length,
    mixedEntries: mixed.length, newTapeTokens: ct(newTape), delta, dependencyOrderPreserved: orderOk });
  T.msg += ct(wire); T.tape += ct(tape); T.newTape += ct(newTape); T.pure += pure.length; T.mixed += mixed.length;
}
L.push('-'.repeat(100));
L.push(`TOTAL: msg ${T.msg}  tape ${T.tape} -> ${T.newTape}  DELTA ${T.newTape - T.tape}  entries pure ${T.pure} / mixed ${T.mixed}`);
L.push('');
L.push('reading: DELTA is the exact change in the COMPLETE message token count, body and contract');
L.push('both untouched. It is an upper bound on the arm because the contract must also describe the');
L.push('scheme, and the measured break-even for a new contract clause is ~20-25 tokens per lane. A');
L.push('negative DELTA on a lane closes front coding for that lane outright.');
const log = L.join('\n') + '\n';
fs.mkdirSync('bench/x95/receipts', { recursive: true });
fs.writeFileSync('bench/x95/receipts/frontcode-exact.json', JSON.stringify(receipt, null, 1) + '\n');
fs.writeFileSync('bench/x95/receipts/frontcode-exact.log', log);
console.log(log);
