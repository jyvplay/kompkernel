/** X90 screen — ΣΥΜΦΥΊΑ gates G1..G5+G8 on all 91 lanes, ZERO frontier calls.
 *
 *  The frontier costs 1.7 s to 175 s per lane (run F: 448 498 ms for 29), so the first
 *  question is never "does it win", it is "is there anything to take to the frontier at
 *  all". symphyiaFit / symphyiaRewrite / symphyiaDecodeWire are pure functions of the
 *  text with no tokenizer dependency beyond countTokens, so the whole selection can be
 *  priced in raw tokens here.
 *
 *  What this screen does and does not establish:
 *    DOES   : a rule set exists at support (G1, G2); a single-token marker is absent
 *             from the text (G3); the set is acyclic (G4); decode(encode) is byte exact
 *             (G5) and the CRC verifies (G8); and the raw token count of contract+wire.
 *    DOES NOT: G6 (the frontier reproducing the rewritten body) and G7 (beating the
 *             incumbent's COMPLETE MESSAGE). A raw win is not a win: the frontier may
 *             already capture the same redundancy, as X89 §4 measured for the post-pass
 *             dictionary (census 202 tokens, real 0). Only the frontier number decides,
 *             and that is bench/x90/run.ts. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { countTokens } from '../../src/lib/omega/bpe';
import { symphyiaFit, symphyiaRewrite, symphyiaDecodeWire, symphyiaContract } from '../../src/lib/omega/symphyia';

const enc = 'o200k_base' as any;
const T = (s: string) => (s === '' ? 0 : countTokens(s, enc));
const MARKERS = '҂჻ᛝ⸙※⁂⁑⸎᚛᚜'.split('').concat(['۞', '࿊', '࿉', '᪥', 'ꙮ']);
const MAX_RULES = 6;

const files: string[] = [];
for (const d of fs.readdirSync('bench').filter((x) => x.startsWith('holdout'))) {
  const dir = 'bench/' + d;
  if (fs.statSync(dir).isDirectory()) for (const f of fs.readdirSync(dir)) files.push(path.join(dir, f));
}
const rows: any[] = [];
let t0 = Date.now();
for (const p of files.sort()) {
  const text = fs.readFileSync(p, 'utf8');
  const ms0 = Date.now();
  const fit = symphyiaFit(text);
  const fitMs = Date.now() - ms0;
  if (!fit.rules.length) { rows.push({ lane: p, chars: text.length, raw: T(text), rules: 0, note: 'no relation at support', fitMs }); continue; }
  const marker = MARKERS.find((g) => !text.includes(g) && T(g) === 1);
  if (!marker) { rows.push({ lane: p, chars: text.length, raw: T(text), rules: fit.rules.length, note: 'NO MARKER', fitMs }); continue; }

  const baseRaw = T(text);
  const chosen: any[] = []; const targets = new Set<number>(); let bestRaw = baseRaw;
  for (const r of fit.rules) {
    if (chosen.length >= MAX_RULES) break;
    if (targets.has(r.j) || targets.has(r.i)) continue;
    const trial = chosen.concat([r]);
    const w = symphyiaRewrite(text, trial, marker);
    if (w.rewritten === 0) continue;
    const raw = T(symphyiaContract(trial, marker, '00000000') + '\n' + w.wire);
    if (raw >= bestRaw) continue;
    bestRaw = raw; chosen.push(r); targets.add(r.j); targets.add(r.i);
  }
  if (!chosen.length) { rows.push({ lane: p, chars: text.length, raw: baseRaw, rules: fit.rules.length, note: 'no rule set lowered raw', fitMs }); continue; }

  const w = symphyiaRewrite(text, chosen, marker);
  const contract = symphyiaContract(chosen, marker, '0'.repeat(8));
  // G8 exercised through the codec's own path, not bypassed: a wrong CRC must refuse.
  const crcRejectsBad = symphyiaDecodeWire(w.wire, chosen, marker, 'ffffffff') === null;
  // G5 exercised on the true CRC. The screen cannot import the codec's private crcOf, so
  // it recomputes CRC-32 over the source text the same way (aither.ts crc32, as
  // syntaxis.ts:185 does) and demands a byte-exact reconstruction.
  const table = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } return t; })();
  const bytes = Buffer.from(text, 'utf8');
  let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) c = table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  const crc = ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
  const ownExact = symphyiaDecodeWire(w.wire, chosen, marker, crc) === text;
  rows.push({
    lane: p, chars: text.length, raw: baseRaw, wireRaw: bestRaw, delta: bestRaw - baseRaw,
    rules: chosen.length, fields: w.rewritten, forms: chosen.map((r: any) => `f${r.j}:${r.form}<-f${r.i}`).join(' '),
    contractTokens: T(contract), fitMs, crcRejectsBad, ownExact, crc,
  });
  if (!ownExact) { console.log(`G5 FAIL ${p}: own inverse is not byte exact`); }
  const d = bestRaw - baseRaw;
  console.log(`${d > 0 ? 'LOSS' : 'WIN '} ${String(d).padStart(5)}  ${p.padEnd(46)} raw ${String(baseRaw).padStart(5)} -> ${String(bestRaw).padStart(5)}  rules=${chosen.length} fields=${String(w.rewritten).padStart(4)} contract=${String(T(contract)).padStart(3)} fit=${fitMs}ms  ${chosen.map((r: any) => `f${r.j}:${r.form}<-f${r.i}`).join(' ')}  G5=${ownExact} G8reject=${crcRejectsBad}`);
}
const tot = Date.now() - t0;
const wins = rows.filter((r) => r.delta < 0).sort((a, b) => a.delta - b.delta);
const losses = rows.filter((r) => r.delta > 0);
console.log(`\n=== RAW SCREEN, ${rows.length} lanes in ${tot} ms (no frontier call) ===`);
console.log(`rule sets found: ${rows.filter((r) => r.rules > 0 && r.delta !== undefined).length}`);
console.log(`raw wins: ${wins.length}   raw losses: ${losses.length}   no relation: ${rows.filter((r) => r.rules === 0).length}`);
console.log(`total raw delta on wins: ${wins.reduce((a, r) => a + r.delta, 0)}`);
const applied = rows.filter((r) => r.delta !== undefined && r.delta < 0);
console.log(`G5 own inverse byte exact on every applied lane: ${applied.every((r) => r.ownExact)} (${applied.length} lanes)`);
console.log(`G8 crc rejects a corrupted crc on every applied lane: ${applied.every((r) => r.crcRejectsBad)}`);
console.log('\nranked raw wins (this is an UPPER BOUND; G6/G7 not yet measured):');
for (const r of wins.slice(0, 20)) console.log(`  ${String(r.delta).padStart(5)}  ${r.lane}`);
if (losses.length) { console.log('\nraw losses (the hill-climb should make these impossible — investigate any):'); for (const r of losses) console.log(`  ${String(r.delta).padStart(5)}  ${r.lane}`); }
fs.mkdirSync('bench/x90/receipts', { recursive: true });
fs.writeFileSync('bench/x90/receipts/screen.json', JSON.stringify({ note: 'X90 raw-token screen, ZERO frontier calls; delta = wireRaw - raw, negative is better; establishes G1-G5+G8 only, NOT G6/G7', lanes: rows, wins: wins.length, losses: losses.length, totalWinDelta: wins.reduce((a, r) => a + r.delta, 0), ms: tot }, null, 1) + '\n');
console.log('\nwrote bench/x90/receipts/screen.json');
