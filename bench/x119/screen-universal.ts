/** X119 WIRE screen: UNIVERSAL glyph alphabet. Existing CHIRON wires declare ONE
 * script by their first tape letter; ἸΣΟΜΟΡΦΊΑ/ΜΕΤΑΤΑΞΙΣ optimise inside it. This
 * screen pools ALL disjoint CHIRON_SCRIPTS ranges into one alphabet and reassigns
 * rule glyphs across scripts, priced on the COMPLETE message with a universal
 * contract. ZERO encoder calls. Exactness is checked by an independent universal
 * expander written here (literal rules only; rep/list refused).
 * Run: bash bench/x15/run.sh bench/x119/screen-universal.ts [messages.jsonl] [out]
 */
import * as fs from 'node:fs';
import { countTokens, type EncodingName } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, chironParseTape, chironDecode, type ChironScript } from '../../src/lib/omega/chiron';
const enc: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, enc);
const UNIVERSAL: ChironScript = { name: 'universal', label: 'letter', lo: 0, hi: 0,
  ranges: CHIRON_SCRIPTS.flatMap(s => s.ranges ?? [[s.lo, s.hi] as [number, number]]) };
const inU = (ch: string) => chironInScript(UNIVERSAL, ch.codePointAt(0)!);
const CONTRACTS = [
  '¶ k=v. expand repeatedly; print only.',
  '¶ new-letter=v. expand repeatedly; print only.',
  '§ new letter before ¶ starts a rule; expand repeatedly; print only.',
  'Each new letter before ¶ defines a rule. Expand repeatedly; print only.',
];
console.log('CONTRACTS', CONTRACTS.map(c => [c, T(c)]));
const CONTRACT = CONTRACTS[1]!;
function parseU(tape: string) {
  if (!tape) return [];
  const used = new Set<string>(); const out: { glyph: string; raw: string }[] = [];
  let i = 0;
  if (!inU(tape[0]!)) return null;
  while (i < tape.length) {
    const g = tape[i]!; if (!inU(g) || used.has(g)) return null; used.add(g);
    let j = i + 1; while (j < tape.length && !(inU(tape[j]!) && !used.has(tape[j]!))) j++;
    out.push({ glyph: g, raw: tape.slice(i + 1, j) }); i = j;
  }
  return out;
}
function decodeU(wire: string): string | null {
  if (!wire.startsWith(CHIRON_START)) return wire;
  const cut = wire.indexOf(CHIRON_SEP, 1); if (cut < 0) return null;
  const parsed = parseU(wire.slice(1, cut)); if (!parsed) return null;
  const idx = new Map(parsed.map((p, i) => [p.glyph, i]));
  const vals: (string | null)[] = parsed.map(() => null);
  const val = (i: number): string | null => {
    if (vals[i] !== null) return vals[i];
    const raw = parsed[i]!.raw; if (raw.startsWith('×') || raw.startsWith('…')) return null;
    let out = '';
    for (const ch of raw) { const j = idx.get(ch); if (j === undefined) out += ch; else { if (j >= i) return null; const v = val(j); if (v === null) return null; out += v; } }
    vals[i] = out; return out;
  };
  let out = '';
  for (const ch of wire.slice(cut + 1)) { const j = idx.get(ch); if (j === undefined) out += ch; else { const v = val(j); if (v === null) return null; out += v; } }
  return out;
}
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const poolCache: string[] = [];
for (const s of CHIRON_SCRIPTS) for (const [a, b] of s.ranges ?? [[s.lo, s.hi] as [number, number]]) for (let cp = a; cp < b; cp++) { const ch = String.fromCodePoint(cp); if (T(ch) === 1) poolCache.push(ch); }
console.log('UNIVERSAL_POOL', poolCache.length);
const src = process.argv[2] ?? 'bench/x117/receipts/frontier.jsonl';
const out = process.argv[3] ?? 'bench/x119/receipts/screen-universal';
const rows: any[] = [];
for (const line of fs.readFileSync(src, 'utf8').split('\n').filter(Boolean)) {
  const r = JSON.parse(line); let m: string = r.message;
  if (src.includes('x117') && r.path.endsWith('/ls-l-real.txt')) m = fs.readFileSync('bench/x118/receipts/regate-lsl-message.txt', 'utf8');
  const base = T(m); const w = m.indexOf(CHIRON_START), cut = m.indexOf(CHIRON_SEP, w + 1);
  if (w < 0 || cut < 0) { rows.push({ path: r.path, base, after: base, note: 'no frame' }); continue; }
  const tape = m.slice(w + 1, cut), body = m.slice(cut + 1);
  const script = CHIRON_SCRIPTS.find(s => tape[0] && chironInScript(s, tape[0].codePointAt(0)!));
  const parsed = script ? chironParseTape(tape, script) : null;
  if (!script || !parsed || !parsed.length) { rows.push({ path: r.path, base, after: base, note: 'bad tape' }); continue; }
  let ref: string; try { ref = chironDecode(m.slice(w)); } catch { rows.push({ path: r.path, base, after: base, note: 'bad decode' }); continue; }
  if (parsed.some(p => p.raw.startsWith('×') || p.raw.startsWith('…'))) { rows.push({ path: r.path, base, after: base, note: 'operator rule' }); continue; }
  const oldKeys = new Set(parsed.map(p => p.glyph));
  // Collision: any universal-alphabet character in the expansion that is not an
  // original key would be read as a reference/key by the universal parser.
  const collision = [...ref].some(ch => inU(ch) && !oldKeys.has(ch));
  if (collision) { rows.push({ path: r.path, base, after: base, note: 'universal collision' }); continue; }
  const poolAll = poolCache.filter(ch => !ref.includes(ch));
  // Stratified deterministic sample of the universal pool (screen, not exhaustive).
  const step = Math.max(1, Math.ceil(poolAll.length / 4096));
  const pool = poolAll.filter((_, i) => i % step === 0);
  for (const p of parsed) if (!pool.includes(p.glyph) && !ref.includes(p.glyph)) pool.push(p.glyph);
  if (pool.length < parsed.length) { rows.push({ path: r.path, base, after: base, note: 'pool too small' }); continue; }
  const prefix = m.slice(0, w); // PRESERVE every parent/OURA/fused clause.
  const render = (map: Map<string, string>) => {
    const mp = (s: string) => { let o = ''; for (const ch of s) o += map.get(ch) ?? ch; return o; };
    const t = parsed.map(p => map.get(p.glyph)! + mp(p.raw)).join('');
    return prefix + CHIRON_START + t + CHIRON_SEP + mp(body);
  };
  // Initial: keep original glyphs (they are in the universal pool) but pay the
  // universal contract. This isolates the alphabet effect from the contract.
  let map = new Map(parsed.map(p => [p.glyph, p.glyph]));
  let best = render(map), bestTok = T(best);
  const startTok = bestTok;
  const rng = mulberry32(0x119);
  let priced = 0, moves = 0;
  const used = new Set(map.values());
  // Candidate glyphs: sample + boundary-aware shortlist. For each rule, collect
  // contexts of its occurrences (tape key position and references) and keep pool
  // chars that merge with at least one neighbour.
  const contexts = (g: string): Array<[string, string]> => {
    const cs: Array<[string, string]> = [];
    const t = parsed.map(p => map.get(p.glyph)! + [...p.raw].map(ch => map.get(ch) ?? ch).join('')).join('');
    for (let i = 0; i < t.length; i++) if (t[i] === map.get(g)) cs.push([t[i - 1] ?? '', t[i + 1] ?? '']);
    const b = [...body].map(ch => map.get(ch) ?? ch).join('');
    for (let i = 0; i < b.length; i++) if (b[i] === map.get(g)) cs.push([b[i - 1] ?? '', b[i + 1] ?? '']);
    return cs;
  };
  for (let pass = 0; pass < 2; pass++) {
    let improved = false;
    for (let ri = 0; ri < parsed.length; ri++) {
      const g = parsed[ri]!.glyph, cur = map.get(g)!;
      const cs = contexts(g).slice(0, 2);
      const scored = pool.filter(ch => !used.has(ch) || ch === cur).map(ch => {
        let s = 0; for (const [a, b] of cs) { s += (a ? T(a + ch) : 0) + (b ? T(ch + b) : 0) - (a ? T(a + cur) : 0) - (b ? T(cur + b) : 0); }
        return { ch, s };
      }).sort((a, b) => a.s - b.s || (a.ch < b.ch ? -1 : 1));
      const cands = scored.slice(0, 48).map(x => x.ch);
      for (let k = 0; k < 16; k++) cands.push(pool[Math.floor(rng() * pool.length)]!);
      let localBest = cur, localTok = bestTok;
      for (const ch of new Set(cands)) {
        if (ch === cur) continue;
        const trial = new Map(map); trial.set(g, ch);
        const msg = render(trial); priced++;
        const tok = T(msg);
        if (tok < localTok) { localTok = tok; localBest = ch; }
      }
      if (localBest !== cur) { used.delete(cur); used.add(localBest); map.set(g, localBest); bestTok = localTok; best = render(map); moves++; improved = true; }
    }
    if (!improved) break;
  }
  const wire = best.slice(best.indexOf(CHIRON_START));
  const dec = decodeU(wire);
  const exact = dec === ref;
  const after = exact ? bestTok : base;
  rows.push({ path: r.path, base, contractOnly: startTok, after, delta: after - base, rules: parsed.length, pool: pool.length, priced, moves, exact, message: exact ? best : m });
  console.log(`${r.path.split('/').pop()!.padEnd(22)} M=${base} contractOnly=${startTok} -> ${after} Δ=${after - base} moves=${moves} priced=${priced} exact=${exact}`);
}
const totalBase = rows.reduce((a, r) => a + r.base, 0), totalAfter = rows.reduce((a, r) => a + r.after, 0);
fs.mkdirSync('bench/x119/receipts', { recursive: true });
fs.writeFileSync(out + '.json', JSON.stringify({ schema: 'kompkernel-x119-universal-screen-v1', note: 'completed-message screen; no encoder calls; universal alphabet', contract: CONTRACT, contractTokens: T(CONTRACT), pool: poolCache.length, totals: { base: totalBase, after: totalAfter, delta: totalAfter - totalBase, wins: rows.filter(r => r.delta < 0).length }, rows }, null, 2) + '\n');
fs.writeFileSync(out + '.jsonl', rows.map(r => JSON.stringify({ path: r.path, tokens: r.after, message: r.message })).join('\n') + '\n');
console.log(`TOTAL ${totalBase} -> ${totalAfter} Δ=${totalAfter - totalBase} wins=${rows.filter(r => r.delta < 0).length}/${rows.length}`);
