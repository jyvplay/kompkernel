/** X90 red team — ΣΥΜΦΥΊΑ under mutation. NO frontier calls; this is pure decode, so it can
 *  run tens of thousands of cases in seconds.
 *
 *  WHY THIS EXISTS, AND WHY A GREEN ROUND TRIP IS NOT THE TEST. X88 measured ΣΥΝΤΆΞΙΣ at
 *  75/75 byte-exact with ZERO wrong round trips while 244 of 427 mutations decoded
 *  SILENTLY WRONG: a corrupted value is still well-formed, so every structural gate still
 *  passes and the reader is handed confident nonsense. G8 (CRC-32 over the source text,
 *  verified as the last step of decode) was bought with that lesson and costs 7 tokens
 *  (contract ladder: L4 22 vs L4-noCrc 15). This file is what justifies paying them.
 *
 *  THE ACCEPTANCE RULE. A mutation may produce exactly two outcomes:
 *      REFUSED  decode returns null      -> the reader knows the message is damaged
 *      EXACT    decode returns the source -> the mutation was semantically a no-op
 *  Anything else is SILENT-WRONG and is a defect, however few. Target: 0.
 *
 *  The mutations are chosen to be the ones a transport or a copy-paste actually produces,
 *  plus the ones specific to THIS arm's structure: a marker moved or duplicated (which
 *  changes which field is rebuilt), a rule index edited in the contract (which rebuilds
 *  the wrong field and is invisible to any per-field syntax check), and a digit changed
 *  inside a rebuilt field. The rule-index edit is the arm's own analogue of X88's failure:
 *  the wire stays perfectly well-formed and only the contract's claim is false. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { symphyiaFit, symphyiaRewrite, symphyiaDecodeWire, symphyiaContract, type SymphyiaRule } from '../../src/lib/omega/symphyia';

const enc = 'o200k_base' as any;
const MARKERS = '҂჻ᛝ⸙※⁂⁑⸎᚛᚜'.split('').concat(['۞', '࿊', '࿉', '᪥', 'ꙮ']);
const LANES = ['bench/holdout-x41/ls-l-real.txt', 'bench/holdout-x86/ls-la-usrbin.txt', 'bench/holdout-x86/dpkg-l-full.txt'];

function crcOf(text: string): string {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[i] = c >>> 0; }
  const bytes = Buffer.from(text, 'utf8');
  let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) c = table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

/** Deterministic PRNG so the receipt is reproducible. */
let seed = 0x5eed90;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length) % a.length];

type Kind = 'char-sub' | 'digit-bump' | 'marker-delete' | 'marker-duplicate' | 'marker-move' | 'field-swap' | 'rule-index' | 'crc-edit' | 'truncate' | 'line-delete' | 'affix-edit';
const KINDS: Kind[] = ['char-sub', 'digit-bump', 'marker-delete', 'marker-duplicate', 'marker-move', 'field-swap', 'rule-index', 'crc-edit', 'truncate', 'line-delete', 'affix-edit'];

const tally = new Map<Kind, { n: number; refused: number; exact: number; wrong: number }>();
for (const k of KINDS) tally.set(k, { n: 0, refused: 0, exact: 0, wrong: 0 });
const wrongExamples: any[] = [];
let totalRefused = 0, totalExact = 0, totalWrong = 0, totalMut = 0;

for (const lane of LANES) {
  const text = fs.readFileSync(lane, 'utf8');
  const fit = symphyiaFit(text);
  const marker = MARKERS.find((g) => !text.includes(g) && countTokens(g, enc) === 1)!;
  // reproduce the shipped selection: the same bounded greedy hill-climb on raw tokens
  const chosen: SymphyiaRule[] = []; const targets = new Set<number>();
  const baseRaw = countTokens(text, enc); let bestRaw = baseRaw;
  for (const r of fit.rules) {
    if (chosen.length >= 6) break;
    if (targets.has(r.j) || targets.has(r.i)) continue;
    const trial = chosen.concat([r]);
    const w = symphyiaRewrite(text, trial, marker);
    if (w.rewritten === 0) continue;
    const raw = countTokens(symphyiaContract(trial, marker, '00000000') + '\n' + w.wire, enc);
    if (raw >= bestRaw) continue;
    bestRaw = raw; chosen.push(r); targets.add(r.j); targets.add(r.i);
  }
  if (!chosen.length) { console.log(`${lane}: no rule set, skipping`); continue; }
  const rw = symphyiaRewrite(text, chosen, marker);
  const crc = crcOf(text);
  if (symphyiaDecodeWire(rw.wire, chosen, marker, crc) !== text) { console.log(`${lane}: BASELINE NOT EXACT — abort`); continue; }
  console.log(`\n━━ ${lane}  rules=${chosen.length} (${chosen.map((r) => `f${r.j}:${r.form}<-f${r.i}`).join(',')}) fields=${rw.rewritten} marker=${marker} crc=${crc}`);

  const lines = rw.wire.split('\n');
  const N = 1400;
  let laneRefused = 0, laneExact = 0, laneWrong = 0;
  for (let m = 0; m < N; m++) {
    const kind = KINDS[m % KINDS.length];
    let wire = rw.wire, rules = chosen, useCrc = crc;
    if (kind === 'char-sub') {
      const p = Math.floor(rnd() * wire.length);
      wire = wire.slice(0, p) + pick('abcdefghijklmnopqrstuvwxyz0123456789 ./-:_"'.split('')) + wire.slice(p + 1);
    } else if (kind === 'digit-bump') {
      const ds = [...wire].map((c, i) => (c >= '0' && c <= '9' ? i : -1)).filter((i) => i >= 0);
      if (!ds.length) continue;
      const p = pick(ds);
      wire = wire.slice(0, p) + String((Number(wire[p]) + 1) % 10) + wire.slice(p + 1);
    } else if (kind === 'marker-delete') {
      const p = wire.indexOf(marker); if (p < 0) continue;
      wire = wire.slice(0, p) + wire.slice(p + marker.length);
    } else if (kind === 'marker-duplicate') {
      const p = wire.indexOf(marker); if (p < 0) continue;
      wire = wire.slice(0, p) + marker + wire.slice(p);
    } else if (kind === 'marker-move') {
      const p = wire.indexOf(marker); if (p < 0) continue;
      const without = wire.slice(0, p) + wire.slice(p + marker.length);
      const q = Math.min(without.length - 1, p + 1 + Math.floor(rnd() * 12));
      wire = without.slice(0, q) + marker + without.slice(q);
    } else if (kind === 'field-swap') {
      const li = Math.floor(rnd() * lines.length);
      const f = lines[li].trim().split(/\s+/);
      if (f.length < 3) continue;
      const a = Math.floor(rnd() * f.length), b = Math.floor(rnd() * f.length);
      if (a === b) continue;
      [f[a], f[b]] = [f[b], f[a]];
      wire = lines.map((l, i) => (i === li ? f.join(' ') : l)).join('\n');
    } else if (kind === 'rule-index') {
      // the arm's own silent-corruption analogue: the wire stays well-formed, only the
      // contract's claim about WHICH FIELD is rebuilt becomes false
      rules = chosen.map((r) => ({ ...r, i: Math.max(1, r.i + (rnd() < 0.5 ? -1 : 1)) }));
    } else if (kind === 'crc-edit') {
      useCrc = ((parseInt(crc, 16) + 1) >>> 0).toString(16).padStart(8, '0');
    } else if (kind === 'truncate') {
      wire = wire.slice(0, Math.max(1, Math.floor(wire.length * (0.3 + rnd() * 0.6))));
    } else if (kind === 'line-delete') {
      if (lines.length < 3) continue;
      const li = Math.floor(rnd() * lines.length);
      wire = lines.filter((_, i) => i !== li).join('\n');
    } else if (kind === 'affix-edit') {
      rules = chosen.map((r) => ({ ...r, A: r.A + 'x', B: r.B + 'x' }));
    }
    totalMut++;
    const t = tally.get(kind)!; t.n++;
    let got: string | null = null, threw = false;
    try { got = symphyiaDecodeWire(wire, rules, marker, useCrc); } catch { threw = true; }
    if (threw || got === null) { t.refused++; laneRefused++; totalRefused++; }
    else if (got === text) { t.exact++; laneExact++; totalExact++; }
    else {
      t.wrong++; laneWrong++; totalWrong++;
      if (wrongExamples.length < 12) wrongExamples.push({ lane, kind, gotLen: got.length, origLen: text.length, head: got.slice(0, 90) });
    }
  }
  console.log(`   mutations ${N}: refused ${laneRefused}, exact ${laneExact}, SILENT-WRONG ${laneWrong}`);
}

console.log(`\n=== ΣΥΜΦΥΊΑ MUTATION TALLY, ${totalMut} mutations over ${LANES.length} lanes ===`);
console.log(`${'kind'.padEnd(18)} ${'n'.padStart(5)} ${'refused'.padStart(8)} ${'exact'.padStart(6)} ${'WRONG'.padStart(6)}`);
for (const [k, v] of tally) console.log(`${k.padEnd(18)} ${String(v.n).padStart(5)} ${String(v.refused).padStart(8)} ${String(v.exact).padStart(6)} ${String(v.wrong).padStart(6)}`);
console.log(`\nTOTAL refused ${totalRefused}  exact ${totalExact}  SILENT-WRONG ${totalWrong}`);
console.log(totalWrong === 0
  ? 'VERDICT: 0 silently-wrong decodes. Every mutation was either refused or a semantic no-op.'
  : `VERDICT: ${totalWrong} SILENTLY-WRONG DECODES — G8 is not sufficient, do not ship.`);
if (wrongExamples.length) { console.log('\nfirst wrong decodes:'); for (const w of wrongExamples) console.log(`  ${w.kind} on ${w.lane.split('/').pop()}: ${JSON.stringify(w.head)}`); }
fs.mkdirSync('bench/x90/receipts', { recursive: true });
fs.writeFileSync('bench/x90/receipts/fuzz.json', JSON.stringify({
  note: 'X90 ΣΥΜΦΥΊΑ mutation fuzz. Acceptance: a mutation must be REFUSED (decode returns null) or EXACT (a semantic no-op). Anything else is silently wrong. No frontier calls; deterministic PRNG seed 0x5eed90.',
  lanes: LANES, mutations: totalMut, refused: totalRefused, exact: totalExact, silentWrong: totalWrong,
  perKind: Object.fromEntries(tally), wrongExamples,
  verdict: totalWrong === 0 ? 'PASS: 0 silently-wrong' : `FAIL: ${totalWrong} silently-wrong`,
}, null, 1) + '\n');
console.log('\nwrote bench/x90/receipts/fuzz.json');
