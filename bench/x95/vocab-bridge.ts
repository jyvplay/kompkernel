/**
 * X95 — BRIDGE TOKENS: can a glyph merge with the LITERAL TEXT it sits next to?
 *
 * WHAT X94 MEASURED AND WHAT IT DID NOT EXPLAIN. Inserting a new reference into literal residue
 * costs ~1 token for the reference plus ~1-2 tokens of severance per site (fitted
 * profit = -0.981k - 3.11, R^2 = 0.869). X94 attributed severance to "the reference severs the
 * BPE merges that the literal text enjoyed on both sides" and cited arXiv:2611.08671 for the
 * mechanism. It did not ask the next question: severance is a property of the GLYPH CHOSEN, not of
 * substitution as such. If the vocabulary contains tokens that span the boundary between an ASCII
 * character and a non-ASCII one, then a glyph drawn from that neighbourhood merges with its
 * neighbour instead of severing it, and the marginal price of a reference falls.
 *
 * WHY THIS IS NOT THE RELABELLING LEVER THAT vocab-merge.ts JUST CLOSED. That probe measured
 * glyph-GLYPH merging (runs of references) and found the incumbent pool already beats the
 * vocabulary's most mergeable 282 glyphs by 17 tokens -- METATHESIS's saturation confirmed at the
 * vocabulary level, headroom negative. This probe measures glyph-LITERAL merging, which is a
 * different boundary, a different objective function, and the one X94's fitted constant actually
 * prices. METATHESIS optimises the interior of a run; this optimises its two ends.
 *
 * A BRIDGE TOKEN is a vocabulary token whose decoded string contains at least one ASCII character
 * and at least one character above U+007F. Its existence is necessary for any glyph to merge with
 * adjacent literal text. Counting them is a vocabulary scan, not a search, so the answer is exact
 * and the lever is either open or closed by the tokenizer itself.
 *
 * ZERO frontier calls, zero lane encodes.
 */
import { decodeIds, countTokensExact, type EncodingName } from '../../src/lib/omega/bpe';
import * as fs from 'node:fs';

const ENC = (process.env.X95_ENC ?? 'o200k_base') as EncodingName;
const LIMIT = Number(process.env.X95_LIMIT ?? 200100);

function block(cp: number): string {
  if (cp >= 0x0400 && cp <= 0x052f) return 'Cyrillic';
  if (cp >= 0x0370 && cp <= 0x03ff) return 'Greek';
  if (cp >= 0x0530 && cp <= 0x058f) return 'Armenian';
  if (cp >= 0x10a0 && cp <= 0x10ff) return 'Georgian';
  if (cp >= 0x0590 && cp <= 0x05ff) return 'Hebrew';
  if (cp >= 0x0600 && cp <= 0x06ff) return 'Arabic';
  if (cp >= 0x4e00 && cp <= 0x9fff) return 'CJK';
  if (cp >= 0x3040 && cp <= 0x30ff) return 'Kana';
  if (cp >= 0xac00 && cp <= 0xd7af) return 'Hangul';
  if (cp >= 0x2c00 && cp <= 0x2c5f) return 'Glagolitic';
  if (cp >= 0xa640 && cp <= 0xa69f) return 'CyrillicExtB';
  if (cp >= 0x2500 && cp <= 0x257f) return 'BoxDraw';
  if (cp >= 0x2190 && cp <= 0x21ff) return 'Arrows';
  if (cp >= 0x2200 && cp <= 0x22ff) return 'MathOps';
  if (cp >= 0x2000 && cp <= 0x206f) return 'GenPunct';
  if (cp >= 0x00a0 && cp <= 0x00ff) return 'Latin1Sup';
  if (cp >= 0x0080 && cp <= 0x009f) return 'C1';
  if (cp >= 0x2460 && cp <= 0x24ff) return 'Enclosed';
  if (cp >= 0x2070 && cp <= 0x209f) return 'SuperSub';
  if (cp >= 0x2150 && cp <= 0x218f) return 'NumForms';
  if (cp >= 0x1d400 && cp <= 0x1d7ff) return 'MathAlpha';
  return 'U+' + cp.toString(16).slice(0, 2) + 'xx';
}
function asciiClass(c: string): string {
  if (c === ' ') return 'SPACE';
  if (c === '\n') return 'NL';
  if (c === '\t') return 'TAB';
  if (/[0-9]/.test(c)) return 'DIGIT';
  if (/[A-Za-z]/.test(c)) return 'LETTER';
  return 'PUNCT:' + c;
}

const t0 = Date.now();
let scanned = 0;
const bridges: { id: number; s: string; ascii: string; nonascii: string; shape: string }[] = [];
for (let id = 0; id < LIMIT; id++) {
  let s: string;
  try { s = decodeIds([id], ENC); } catch { continue; }
  scanned++;
  const chars = [...s];
  let hasA = false, hasN = false;
  for (const c of chars) { if (c.codePointAt(0)! <= 127) hasA = true; else hasN = true; }
  if (!hasA || !hasN) continue;
  const a = chars.filter(c => c.codePointAt(0)! <= 127).join('');
  const n = chars.filter(c => c.codePointAt(0)! > 127).join('');
  bridges.push({ id, s, ascii: a, nonascii: n, shape: chars.map(c => c.codePointAt(0)! <= 127 ? 'a' : 'N').join('') });
}
const ms = Date.now() - t0;

const byShape = new Map<string, number>();
const byPair = new Map<string, number>();
const glyphBridgeFreq = new Map<string, number>();
for (const b of bridges) {
  byShape.set(b.shape, (byShape.get(b.shape) ?? 0) + 1);
  for (const c of b.ascii) {
    const key = asciiClass(c) + ' <-> ' + [...b.nonascii].map(x => block(x.codePointAt(0)!)).join('/');
    byPair.set(key, (byPair.get(key) ?? 0) + 1);
  }
  for (const g of b.nonascii) glyphBridgeFreq.set(g, (glyphBridgeFreq.get(g) ?? 0) + 1);
}

const L: string[] = [];
L.push(`ENCODING ${ENC}   ids scanned ${scanned}   scan ${ms} ms`);
L.push(`BRIDGE TOKENS (containing >=1 ASCII and >=1 non-ASCII character): ${bridges.length}`);
L.push(`distinct non-ASCII glyphs that participate in at least one bridge: ${glyphBridgeFreq.size}`);
L.push('');
L.push('shape histogram (a = ASCII char, N = non-ASCII char):');
for (const [s, n] of [...byShape.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)) L.push('  ' + s.padEnd(12) + String(n).padStart(6));
L.push('');
L.push('ASCII class <-> non-ASCII block, the boundaries that matter for a body:');
for (const [k, n] of [...byPair.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24)) L.push('  ' + k.padEnd(46) + String(n).padStart(6));
L.push('');
L.push('the 24 glyphs that bridge most:');
for (const [g, n] of [...glyphBridgeFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24))
  L.push(`  ${g}  U+${g.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}  ${block(g.codePointAt(0)!).padEnd(13)} bridges=${String(n).padStart(4)}`);

// THE DECISIVE MEASUREMENT: does a bridge glyph actually reduce the marginal cost of a reference
// in a realistic body context? Take the contexts that occur in the shipped wires and price the
// insertion of a bridge glyph against an incumbent glyph.
const CTX = [' ', '\n', '  ', '1 ', ' 4096', 'root ', ' Nov ', '-rw-r--r-- ', 'the ', 'x=', ':', ' /', '9 ', 'drwxr-xr-x '];
const topBridges = [...glyphBridgeFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(x => x[0]);
const wires = fs.readdirSync('bench/x87/receipts/wires').filter(f => f.endsWith('.wire.txt'));
const incumbent: string[] = [];
for (const f of wires) {
  const w = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const sec = w.indexOf('§'), pil = w.indexOf('¶', sec);
  const seen = new Set<string>();
  for (const ch of w.slice(sec + 1, pil)) if (ch.codePointAt(0)! > 127 && !seen.has(ch)) { seen.add(ch); if (!incumbent.includes(ch)) incumbent.push(ch); }
}
const incSample = incumbent.slice(0, 12);
L.push('');
L.push('MARGINAL COST OF INSERTING ONE GLYPH INTO A REALISTIC CONTEXT (tokens added, 0.00 = free):');
L.push('  context'.padEnd(22) + 'incumbent mean   bridge mean   difference');
let incSum = 0, brSum = 0, nC = 0;
for (const ctx of CTX) {
  const base = countTokensExact(ctx, ENC);
  let inc = 0, br = 0;
  for (const g of incSample) inc += countTokensExact(ctx + g, ENC) - base;
  for (const g of topBridges) br += countTokensExact(ctx + g, ENC) - base;
  inc /= incSample.length; br /= topBridges.length;
  incSum += inc; brSum += br; nC++;
  L.push('  ' + JSON.stringify(ctx).padEnd(20) + inc.toFixed(3).padStart(10) + br.toFixed(3).padStart(14) + (br - inc).toFixed(3).padStart(12));
}
L.push('  ' + 'MEAN OVER CONTEXTS'.padEnd(20) + (incSum / nC).toFixed(3).padStart(10) + (brSum / nC).toFixed(3).padStart(14) + ((brSum - incSum) / nC).toFixed(3).padStart(12));
L.push('');
L.push('VERIFICATION: a bridge token must re-encode to exactly 1 token for the merge to be real.');
let ver = 0, ref = 0;
for (const b of bridges.slice(0, 600)) { const n = countTokensExact(b.s, ENC); if (n === 1) ver++; else ref++; }
L.push(`  bridges re-encoded: ${ver + ref}   exactly 1 token: ${ver}   more: ${ref}   (${(100 * ref / Math.max(1, ver + ref)).toFixed(1)}% of vocabulary membership does NOT survive encoding)`);

const log = L.join('\n') + '\n';
fs.mkdirSync('bench/x95/receipts', { recursive: true });
fs.writeFileSync('bench/x95/receipts/vocab-bridge.json', JSON.stringify({
  encoding: ENC, scanned, scanMs: ms, bridgeTokens: bridges.length,
  distinctBridgeGlyphs: glyphBridgeFreq.size,
  byShape: [...byShape.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
  byBoundary: [...byPair.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40),
  topBridgeGlyphs: [...glyphBridgeFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 80)
    .map(([g, n]) => ({ g, cp: 'U+' + g.codePointAt(0)!.toString(16).toUpperCase(), block: block(g.codePointAt(0)!), bridges: n })),
  marginalCost: { contexts: CTX, incumbentMean: incSum / nC, bridgeMean: brSum / nC },
  reencode: { verified: ver, refuted: ref },
  bridgeSamples: bridges.slice(0, 60),
}, null, 1) + '\n');
fs.writeFileSync('bench/x95/receipts/vocab-bridge.log', log);
console.log(log);
