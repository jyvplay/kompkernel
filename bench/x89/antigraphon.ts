/** X89 probe 3 — ΑΝΤΙΓΡΑΦΟΝ (antigraphon), "a copy": intern the frontier wire's own
 *  MAXIMAL TOKEN-ALIGNED REPEATS, of unbounded length, from TWO occurrences up.
 *
 *  WHY THIS IS NOT A KNOB TURN ON MERISMOS.  MERISMOS (X77) enumerates CHARACTER
 *  substrings of length 4..24 requiring >=3 occurrences (MIN_LEN/MAX_LEN/MIN_OCC), which
 *  is a brute-force window: 21 lengths per start. The census in bench/x89/probe2.ts shows
 *  the repetition that is actually left on the frontier wire is TOKEN-ALIGNED, frequently
 *  longer than 24 characters, and frequently occurs exactly TWICE -- i.e. outside that
 *  window on all three axes at once. 14 of 15 committed wires have payable spans; the
 *  literal-rule upper bound is 202 tokens, 79 of them (3.49%) on dpkg-l-full alone.
 *
 *  Token-alignment is the mechanism, not a detail. A character span that starts or ends
 *  mid-token splits a token, and the id glyph then re-tokenises with whatever neighbours
 *  the split left behind, so the saving is not the span's token count. A token-aligned
 *  span is replaced by exactly one glyph and every fold costs exactly one token.
 *
 *  Discovery is by growing n-gram census over the TOKEN sequence with early stop at the
 *  first length that has no repeat, so the candidate length is unbounded without paying
 *  O(n^2). Occurrence counts are then RE-VERIFIED against the wire with indexOf, because
 *  a census over token n-grams counts ALIGNMENTS, not occurrences: "ab"+"c" and "a"+"bc"
 *  both concatenate to "abc", and one wire token here decodes to the empty string.
 *
 *  PRICING NEEDS NO FRONTIER CALL. The saved wire's own token count IS the frontier
 *  figure (countTokens(wire) == F for every lane in bench/x86/receipts/frontier-runE.json),
 *  so this is a post-pass and Gate 3 is a direct comparison against F.
 *
 *  GATES, in the discipline X88 bought at the price of 244 silent-wrong decodes:
 *   G0  every id character is ABSENT from the wire, so it is also absent from every
 *       replacement string (all of which are substrings of the wire) -- no cascade, and
 *       decode is a single left-to-right pass.
 *   G1  decode(encode(wire)) === wire byte for byte, or refuse.
 *   G2  the id pool must supply at least one character per selected entry.
 *   G3  countTokens(message) < countTokens(wire), STRICT, measured, or refuse.
 *   G4  CRC-32 of the rebuilt wire in the contract. A dictionary substitution is exactly
 *       the class of edit that stays well-formed when corrupted, so without this a flipped
 *       body character decodes to different text and says nothing.
 */
import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
import { crc32 } from '../../src/lib/omega/aither';

const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const HEAD = '§ANTIGRAPHON';
const ID_POOL = 'абвгдежзийклмнопрстуфхцчшщъыьэюяАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯαβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ†‡•·±×÷≠∞≈≤≥'.split('');
const MAX_DICT = 24, MAX_N = 400;

export interface AntiResult { applied: boolean; message: string; decoded: string; exact: boolean; wireTokens: number; messageTokens: number; save: number; entries: { id: string; p: number; occ: number; text: string }[]; crc: string; note: string; }

/** decode: one left-to-right pass, no cascade (G0 guarantees ids absent from replacements) */
export function antigraphonDecode(message: string): string {
  const nl = message.indexOf('\n');
  if (nl < 0 || !message.startsWith(HEAD)) return message;
  const rest = message.slice(HEAD.length, nl).trim();
  const body = message.slice(nl + 1);
  const dict = new Map<string, string>();
  let wantCrc = '';
  for (const kv of rest.split(' ')) {
    if (kv.startsWith('H=')) { wantCrc = kv.slice(2); continue; }
    if (kv.length < 3 || kv[1] !== '=') return message;
    dict.set(kv[0], kv.slice(2));
  }
  let out = '';
  for (const ch of body) out += dict.get(ch) ?? ch;
  if (wantCrc && (crc32(out) >>> 0).toString(16).padStart(8, '0') !== wantCrc) return message;   // G4
  return out;
}

export function antigraphonEncode(wire: string): AntiResult {
  const wireTokens = T(wire);
  const refuse = (note: string): AntiResult => ({ applied: false, message: wire, decoded: wire, exact: true, wireTokens, messageTokens: wireTokens, save: 0, entries: [], crc: '', note });
  const toks = tokenStrings(wire, enc);
  if (toks.map(t => t.s).join('') !== wire) return refuse('token decomposition does not reproduce the wire');
  // Token-aligned n-gram census, unbounded length. Repeat-hood is MONOTONE in length:
  // if a span of n tokens repeats, its prefix of n-1 tokens repeats too, so the first
  // length with no repeated span is a sound stopping point and no longer repeat exists
  // beyond it. Only repeated spans are retained -- retaining every n-gram is what put
  // the first version of this probe out of memory (1 476 tokens x 400 lengths).
  const spans: string[] = [];
  for (let n = 2; n <= Math.min(MAX_N, toks.length); n++) {
    const m = new Map<string, number>();
    for (let i = 0; i + n <= toks.length; i++) { let s = ''; for (let j = i; j < i + n; j++) s += toks[j].s; m.set(s, (m.get(s) ?? 0) + 1); }
    let any = false;
    for (const [s, c] of m) if (c >= 2 && s.length >= 2) { spans.push(s); any = true; }
    if (!any) break;
  }
  const occOf = (s: string): number => { let k = 0, from = 0; for (;;) { const i = wire.indexOf(s, from); if (i < 0) return k; k++; from = i + 1; } };
  const seen = new Set<string>();
  const cands = spans.filter(s => !seen.has(s) && seen.add(s)).map(s => { const occ = occOf(s); const p = T(s); return { s, p, occ, save: occ * p - p - occ - 1 }; })
    .filter(c => c.occ >= 2 && c.save > 0);
  if (!cands.length) return refuse('no repeated token-aligned span pays for a rule');
  // drop spans dominated by a longer span with the same occurrence count
  cands.sort((a, b) => b.save - a.save || b.p - a.p);
  const keep = cands.filter(c => !cands.some(d => d !== c && d.p > c.p && d.occ === c.occ && d.s.includes(c.s)));
  const free = ID_POOL.filter(g => !wire.includes(g));
  if (!free.length) return refuse('no id character absent from the wire');
  // greedy, non-overlapping, then a measured hill-climb: an entry is kept only if the
  // REAL token count of the whole message drops
  const used = new Uint8Array(wire.length);
  const entries: { id: string; p: number; occ: number; text: string }[] = [];
  let best = wireTokens, bestBody = wire, bestMsg = wire;
  for (const c of keep) {
    if (entries.length >= MAX_DICT || !free.length) break;
    let occ = 0, ok = true, from = 0;
    for (;;) { const i = wire.indexOf(c.s, from); if (i < 0) break; occ++; for (let q = i; q < i + c.s.length; q++) if (used[q]) { ok = false; break; } if (!ok) break; from = i + 1; }
    if (!ok || occ < 2) continue;
    const id = free.shift()!;
    const trial = entries.concat([{ id, p: c.p, occ, text: c.s }]);
    const body = applyAll(wire, trial);
    const crc = (crc32(wire) >>> 0).toString(16).padStart(8, '0');
    const msg = HEAD + ' ' + trial.map(e => `${e.id}=${e.text}`).join(' ') + ` H=${crc}` + '\n' + body;
    const mt = T(msg);
    if (mt >= best) { free.unshift(id); continue; }        // hill-climb: refuse a non-improving entry
    best = mt; bestBody = body; bestMsg = msg;
    entries.push({ id, p: c.p, occ, text: c.s });
  }
  if (!entries.length) return refuse('no entry lowered the measured message cost');
  if (best >= wireTokens) return refuse(`G3: ${best} >= ${wireTokens}`);
  const decoded = antigraphonDecode(bestMsg);
  if (decoded !== wire) return refuse('G1: decode is not byte-exact');
  return { applied: true, message: bestMsg, decoded, exact: true, wireTokens, messageTokens: best, save: wireTokens - best, entries, crc: (crc32(wire) >>> 0).toString(16).padStart(8, '0'), note: `${entries.length} entries` };
}

function applyAll(wire: string, entries: { id: string; text: string }[]): string {
  // simultaneous replacement, longest span first so a shorter span inside a longer one
  // cannot claim characters the longer one already took
  const order = [...entries].sort((a, b) => b.text.length - a.text.length);
  const idOf = new Map(order.map(e => [e.text, e.id]));
  const used = new Uint8Array(wire.length);
  const out: string[] = [];
  let at = 0;
  while (at < wire.length) {
    let hit: { text: string; id: string } | null = null;
    for (const e of order) if (!used[at] && wire.startsWith(e.text, at)) { hit = e; break; }
    if (hit) { out.push(hit.id); for (let q = at; q < at + hit.text.length; q++) used[q] = 1; at += hit.text.length; }
    else { out.push(wire[at]); at++; }
  }
  void idOf;
  return out.join('');
}

// ---- run over every committed frontier wire ----
if (process.argv[1] && process.argv[1].endsWith('antigraphon.mjs')) {
  const dirs = ['bench/x87/receipts/wires', 'bench/x88/receipts'];
  const rows: any[] = [];
  for (const d of dirs) { if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).sort()) { if (!f.endsWith('.wire.txt')) continue;
      const wire = fs.readFileSync(d + '/' + f, 'utf8');
      const lane = f.replace('.wire.txt', '');
      const t0 = Date.now();
      const r = antigraphonEncode(wire);
      rows.push({ lane, F: r.wireTokens, M: r.messageTokens, save: r.save, applied: r.applied, exact: r.exact, entries: r.entries.length, note: r.note, ms: Date.now() - t0 });
      const x = rows[rows.length - 1];
      console.log(`${lane.padEnd(30)} F=${String(x.F).padStart(5)} -> ANTIGRAPHON=${String(x.M).padStart(5)}  save=${String(x.save).padStart(4)} (${(100 * x.save / x.F).toFixed(2)}%)  entries=${x.entries} exact=${x.exact} ${x.ms}ms${r.applied ? '' : '  REFUSED: ' + x.note}`);
      fs.writeFileSync('bench/x89/receipts/antigraphon.json', JSON.stringify({ rows, totalF: rows.reduce((a, b) => a + b.F, 0), totalM: rows.reduce((a, b) => a + b.M, 0) }, null, 1) + '\n');
    } }
  const F = rows.reduce((a, b) => a + b.F, 0), M = rows.reduce((a, b) => a + b.M, 0);
  console.log(`\n=== ΑΝΤΙΓΡΑΦΟΝ over ${rows.length} committed frontier wires ===`);
  console.log(`applied ${rows.filter(r => r.applied).length}/${rows.length}   byte-exact ${rows.filter(r => r.exact).length}/${rows.length}`);
  console.log(`TOTAL F ${F} -> ${M}   SAVE ${F - M} tokens (${(100 * (F - M) / F).toFixed(2)}%)`);
}
