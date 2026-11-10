/**
 * X95 — IS THE TAPE'S OWN GLYPH COLUMN IN ANYBODY'S OBJECTIVE FUNCTION?
 *
 * THE GAP. ariadne.ts assigns glyphs to rules by hill-climbing `runCostPrepared`, whose objective
 * is the token cost of the reference RUNS IN THE BODY. That is the right objective for the body and
 * it is heavily optimised (X57 work budget, X59 branch-and-bound, X82 generation stamping, and a
 * run-spelling construction that places whole runs onto multi-character Cyrillic vocabulary
 * tokens). But the tape is also made of glyphs: it is `g1 v1 g2 v2 ... `, and each glyph sits
 * immediately against its own value. docs/codecs.md's cost-centre accounting prices that column at
 * 447 tokens over the ten committed wires -- 5.7 % of the message, 0.73 tokens per glyph against
 * 610 entries -- and NO objective in the stack contains it. METATHESIS relabels glyphs and X93
 * recorded it as saturated at -14 tokens, but saturation of a search is a statement about the
 * objective it was searching, and the tape boundary is not in that objective.
 *
 * vocab-bridge.ts supplies the reason to look: 41 726 vocabulary tokens contain both ASCII and
 * non-ASCII characters, so a glyph CAN merge with the first characters of its own value, and which
 * glyph does so depends on the value. A glyph chosen for a body run is not generally a glyph that
 * bridges into its value.
 *
 * WHAT THIS MEASURES. Per entry, the marginal cost of the glyph in situ -- ct(g+v) - ct(v) -- and
 * the minimum of that quantity over every glyph in the vocabulary's bridging set that the wire does
 * not already use. The difference summed over a lane is an UPPER BOUND on what a tape-aware
 * assignment could recover on that lane's tape, before any interaction with the body objective.
 * An upper bound near zero closes the lever; a large one says there is an arm to build.
 *
 * ZERO frontier calls, zero encodes of any lane.
 */
import { countTokensExact, decodeIds, type EncodingName } from '../../src/lib/omega/bpe';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ENC = (process.env.X95_ENC ?? 'o200k_base') as EncodingName;
const ct = (s: string) => countTokensExact(s, ENC);
type Entry = { g: string; v: string };

// the candidate glyph set: every non-ASCII character that appears in a vocabulary token together
// with an ASCII character (a bridge glyph), restricted to the scripts the stack already uses so the
// result stays comparable to the incumbent pool rather than flattered by an exotic one.
const LIMIT = Number(process.env.X95_LIMIT ?? 200100);
const ALLOW = process.env.X95_SCRIPTS ?? 'cyrillic,greek,armenian,georgian';
function scriptOf(cp: number): string {
  if (cp >= 0x0400 && cp <= 0x052f) return 'cyrillic';
  if (cp >= 0x0370 && cp <= 0x03ff) return 'greek';
  if (cp >= 0x0530 && cp <= 0x058f) return 'armenian';
  if (cp >= 0x10a0 && cp <= 0x10ff) return 'georgian';
  if (cp >= 0x2c00 && cp <= 0x2c5f) return 'glagolitic';
  if (cp >= 0xa640 && cp <= 0xa69f) return 'cyrillic';
  return 'other';
}
const allow = new Set(ALLOW.split(','));
const bridgeGlyphs = new Set<string>();
for (let id = 0; id < LIMIT; id++) {
  let s: string;
  try { s = decodeIds([id], ENC); } catch { continue; }
  const chars = [...s];
  let hasA = false, hasN = false;
  for (const c of chars) { if (c.codePointAt(0)! <= 127) hasA = true; else hasN = true; }
  if (!hasA || !hasN) continue;
  for (const g of chars) { const cp = g.codePointAt(0)!; if (cp > 127 && allow.has(scriptOf(cp))) bridgeGlyphs.add(g); }
}
const POOL = [...bridgeGlyphs];

const files = process.argv.slice(2);
const L: string[] = [];
const receipt: any = { note: 'upper bound on tape-aware glyph assignment; zero frontier calls', poolSize: POOL.length, lanes: [] };
L.push(`candidate bridge-glyph pool from scripts {${ALLOW}}: ${POOL.length} glyphs`);
L.push('lane'.padEnd(14) + 'msgTok  ents  tapeTok  glyphCol  UPPER-BOUND SAVING  % of msg  entries that would change');
let T = { msg: 0, ents: 0, tape: 0, col: 0, save: 0, chg: 0 };
for (const f of files) {
  const wire = fs.readFileSync(f, 'utf8');
  const name = path.basename(f).replace('.wire.txt', '');
  const sec = wire.indexOf('§'), pil = wire.indexOf('¶', sec);
  const tape = wire.slice(sec + 1, pil), body = wire.slice(pil + 1);
  const seen = new Set<string>(); const ents: Entry[] = []; let cur: Entry | null = null;
  for (const ch of tape) {
    if (ch.codePointAt(0)! > 127 && !seen.has(ch)) { seen.add(ch); cur = { g: ch, v: '' }; ents.push(cur); }
    else if (cur) cur.v += ch;
  }
  const used = new Set<string>([...wire]);
  const free = POOL.filter(g => !used.has(g));
  const tapeTok = ct(tape);
  let col = 0, save = 0, chg = 0;
  const examples: any[] = [];
  for (const e of ents) {
    const vTok = ct(e.v);
    const here = ct(e.g + e.v) - vTok;      // marginal cost of THIS glyph against its own value
    col += here;
    let best = here, bestG = e.g;
    for (const g of free) { const c = ct(g + e.v) - vTok; if (c < best) { best = c; bestG = g; } }
    if (best < here) { save += here - best; chg++; if (examples.length < 4) examples.push({ from: e.g, to: bestG, v: e.v.slice(0, 24), from_cost: here, to_cost: best }); }
  }
  const msg = ct(wire);
  L.push(name.padEnd(14) + String(msg).padStart(6) + String(ents.length).padStart(6) + String(tapeTok).padStart(9) +
    String(col).padStart(10) + String(save).padStart(18) + (100 * save / msg).toFixed(2).padStart(9) + String(chg).padStart(14));
  receipt.lanes.push({ lane: name, msgTokens: msg, entries: ents.length, tapeTokens: tapeTok, glyphColumn: col,
    upperBoundSaving: save, pctOfMessage: 100 * save / msg, entriesThatWouldChange: chg, examples });
  T.msg += msg; T.ents += ents.length; T.tape += tapeTok; T.col += col; T.save += save; T.chg += chg;
}
L.push('-'.repeat(104));
L.push(`TOTAL: msg ${T.msg}  entries ${T.ents}  tape ${T.tape}  glyph column ${T.col}  UPPER-BOUND SAVING ${T.save} (${(100 * T.save / T.msg).toFixed(2)}% of the ten-wire total)  entries changing ${T.chg}/${T.ents}`);
L.push('caveat: an upper bound computed per entry independently. A real assignment must keep glyphs');
L.push('distinct, and changing a glyph changes its cost in the BODY too, which is ariadne\'s objective');
L.push('and is not modelled here -- so the realisable figure is below this and could be negative.');
const log = L.join('\n') + '\n';
fs.mkdirSync('bench/x95/receipts', { recursive: true });
fs.writeFileSync('bench/x95/receipts/tape-glyph-headroom.json', JSON.stringify(receipt, null, 1) + '\n');
fs.writeFileSync('bench/x95/receipts/tape-glyph-headroom.log', log);
console.log(log);
