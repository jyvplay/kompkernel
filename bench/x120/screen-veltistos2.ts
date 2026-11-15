/**
 * X120 screen v2 — ΒΕΛΤΙΣΤΟΣ with TAPE re-spelling and (optional) INDUCTION.
 *
 * Stage 1  body: global shortest path over {literal char, rule glyph} edges.
 * Stage 2  tape: the same shortest path applied to each rule's own value, using
 *          only EARLIER glyphs (a later glyph would be parsed as a new KEY).
 * Stage 3  prune: delete rules no longer reachable from body or tape.
 * Stage 4  optional induction (X120_INDUCT=n): propose n repeated literal spans
 *          as NEW rules, each priced by re-running stage 1, kept only on a strict
 *          whole-message win. This is the first place in the stack where a rule
 *          is admitted by a GLOBAL parse rather than by a greedy all-occurrence
 *          substitution.
 * Every stage is gated by the real whole-message price and chironDecode equality.
 * Zero encoder calls.
 *
 * Run: bash bench/x15/run.sh bench/x120/screen-veltistos2.ts [messages.jsonl] [out]
 */
import * as fs from 'node:fs';
import { countTokens, type EncodingName } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, chironParseTape, chironDecode, type ChironScript } from '../../src/lib/omega/chiron';

const enc: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, enc);
const src = process.argv[2] ?? 'bench/x119/receipts/final-frontier.jsonl';
const out = process.argv[3] ?? 'bench/x120/receipts/screen-veltistos2';
const CTX = Number(process.env.X120_CTX ?? 24);
const BEAM = Number(process.env.X120_BEAM ?? 8);
const INDUCT = Number(process.env.X120_INDUCT ?? 0);
const ONLY = process.env.X120_ONLY ?? '';
const MAX_MATCH = 12;

interface Entry { g: string; v: string }
interface State { ctx: string; ctxTok: number; cost: number; bi: number; bs: number; piece: string }
let edgesTotal = 0;

function shortestPath(ref: string, entries: Entry[], ctxLen: number, beam: number, seedCtx = ''): { body: string; cost: number } {
  const byFirst = new Map<string, Entry[]>();
  for (const e of entries) { const k = e.v[0]!; if (!byFirst.has(k)) byFirst.set(k, []); byFirst.get(k)!.push(e); }
  for (const list of byFirst.values()) list.sort((a, b) => b.v.length - a.v.length);
  const N = ref.length;
  const dp: State[][] = Array.from({ length: N + 1 }, () => []);
  dp[0] = [{ ctx: seedCtx, ctxTok: seedCtx ? T(seedCtx) : 0, cost: 0, bi: -1, bs: -1, piece: '' }];
  const push = (j: number, s: State) => {
    const arr = dp[j];
    for (let k = 0; k < arr.length; k++) if (arr[k].ctx === s.ctx) { if (s.cost < arr[k].cost) arr[k] = s; return; }
    arr.push(s);
  };
  for (let i = 0; i < N; i++) {
    const arr = dp[i];
    if (!arr.length) continue;
    arr.sort((a, b) => a.cost - b.cost || a.ctx.localeCompare(b.ctx));
    if (arr.length > beam) arr.length = beam;
    const matches = (byFirst.get(ref[i]!) ?? []).filter(e => ref.startsWith(e.v, i)).slice(0, MAX_MATCH);
    for (let si = 0; si < arr.length; si++) {
      const s = arr[si];
      const pieces: Array<[string, number]> = [[ref[i]!, i + 1]];
      for (const e of matches) pieces.push([e.g, i + e.v.length]);
      for (const [piece, j] of pieces) {
        edgesTotal++;
        const joined = s.ctx + piece;
        const cost = s.cost + T(joined) - s.ctxTok;
        const ctx = ctxLen > 0 ? joined.slice(-ctxLen) : '';
        push(j, { ctx, ctxTok: ctx ? T(ctx) : 0, cost, bi: i, bs: si, piece });
      }
    }
  }
  const last = dp[N];
  if (!last.length) return { body: ref, cost: Infinity };
  last.sort((a, b) => a.cost - b.cost);
  let bi = N, bs = 0; const parts: string[] = [];
  while (bi > 0) { const s = dp[bi][bs]!; parts.push(s.piece); bi = s.bi; bs = s.bs; }
  parts.reverse();
  return { body: parts.join(''), cost: last[0].cost };
}

function prune(tape: string, body: string, parsed: { glyph: string; raw: string }[]): string {
  const rawOf = new Map(parsed.map(p => [p.glyph, p.raw]));
  const keys = new Set(parsed.map(p => p.glyph));
  const live = new Set<string>(); const stack: string[] = [];
  for (const ch of body) if (keys.has(ch) && !live.has(ch)) { live.add(ch); stack.push(ch); }
  while (stack.length) { const g = stack.pop()!; for (const ch of rawOf.get(g) ?? '') if (keys.has(ch) && !live.has(ch)) { live.add(ch); stack.push(ch); } }
  return parsed.filter(p => live.has(p.glyph)).map(p => p.glyph + p.raw).join('');
}

function valuesOf(tape: string, parsed: { glyph: string; raw: string }[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const p of parsed) {
    if (p.raw.startsWith('×') || p.raw.startsWith('…')) continue;
    try { const v = chironDecode(CHIRON_START + tape + CHIRON_SEP + p.glyph); if (v && v !== p.glyph && v.length <= 4000) out.set(p.glyph, v); } catch { /* skip */ }
  }
  return out;
}

function freeGlyphs(script: ChironScript, avoid: string, want: number): string[] {
  const used = new Set(avoid); const out: string[] = [];
  const ranges: Array<[number, number]> = script.ranges ?? [[script.lo, script.hi]];
  for (const [a, b] of ranges) {
    for (let cp = a; cp < b && out.length < want; cp++) {
      const ch = String.fromCodePoint(cp);
      if (used.has(ch)) continue;
      if (T(ch) !== 1) continue;
      out.push(ch);
    }
    if (out.length >= want) break;
  }
  return out;
}

/** Repeated literal spans, ranked by the tokens a new rule could retire. */
function candidates(ref: string, existing: Set<string>, want: number): string[] {
  const LENS = [64, 48, 32, 24, 16, 12, 8];
  const seen = new Map<string, number>();
  for (const L of LENS) {
    if (ref.length < L * 2) continue;
    const local = new Map<string, number>();
    for (let i = 0; i + L <= ref.length; i++) { const s = ref.slice(i, i + L); local.set(s, (local.get(s) ?? 0) + 1); }
    for (const [s, n] of local) if (n >= 2 && !existing.has(s)) seen.set(s, Math.max(seen.get(s) ?? 0, n * (T(s) - 1) - T(s) - 2));
  }
  const ranked = [...seen.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length || a[0].localeCompare(b[0]));
  const picked: string[] = [];
  for (const [s] of ranked) {
    if (picked.some(p => p.includes(s) || s.includes(p))) continue;
    picked.push(s); if (picked.length >= want) break;
  }
  return picked;
}

const rows: any[] = [];
for (const line of fs.readFileSync(src, 'utf8').split('\n').filter(Boolean)) {
  const r = JSON.parse(line);
  if (ONLY && !r.path.includes(ONLY)) continue;
  const m: string = r.message; const base = T(m);
  const w = m.indexOf(CHIRON_START), cut = m.indexOf(CHIRON_SEP, w + 1);
  const skip = (note: string) => { rows.push({ path: r.path, base, after: base, delta: 0, note }); console.log(`${r.path.split('/').pop()!.padEnd(22)} M=${base} SKIP ${note}`); };
  if (w < 0 || cut < 0) { skip('no frame'); continue; }
  const prefix = m.slice(0, w), tape0 = m.slice(w + 1, cut), body0 = m.slice(cut + 1);
  const script = CHIRON_SCRIPTS.find(s => tape0[0] && chironInScript(s, tape0[0].codePointAt(0)!));
  const parsed0 = script ? chironParseTape(tape0, script) : null;
  if (!script || !parsed0 || !parsed0.length) { skip('bad tape'); continue; }
  let ref: string; try { ref = chironDecode(m.slice(w)); } catch { skip('decode threw'); continue; }
  if (ref.length > 60_000) { skip('too long'); continue; }
  const t0 = performance.now(); edgesTotal = 0;
  const vals0 = valuesOf(tape0, parsed0 as any);
  const entries0: Entry[] = [...vals0].map(([g, v]) => ({ g, v }));
  const build = (tape: string, body: string) => prefix + CHIRON_START + tape + CHIRON_SEP + body;
  const exact = (mm: string) => { try { return chironDecode(mm.slice(w)) === ref; } catch { return false; } };

  // stage 1 — body
  let tape = tape0, body = shortestPath(ref, entries0, CTX, BEAM).body;
  let best = m, bestTok = base;
  const consider = (t: string, b: string, p: { glyph: string; raw: string }[], tag: string) => {
    const nt = prune(t, b, p); const mm = build(nt, b); const tok = T(mm);
    if (tok < bestTok && exact(mm)) { best = mm; bestTok = tok; tape = nt; body = b; return tag; }
    return null;
  };
  const s1 = consider(tape, body, parsed0 as any, 'body');
  // stage 2 — tape values, earliest-definition-first
  let parsed = chironParseTape(tape, script)!;
  const vals = valuesOf(tape, parsed as any);
  const earlier: Entry[] = []; const newRaw = new Map<string, string>();
  for (const p of parsed) {
    const v = vals.get(p.glyph);
    if (v !== undefined && v.length >= 2 && earlier.length) {
      const seed = (parsed.slice(0, parsed.indexOf(p)).map(q => q.glyph + (newRaw.get(q.glyph) ?? q.raw)).join('') + p.glyph).slice(-CTX);
      const sp = shortestPath(v, earlier, CTX, Math.min(BEAM, 4), seed).body;
      if (sp !== p.raw) newRaw.set(p.glyph, sp);
    }
    if (v !== undefined) earlier.push({ g: p.glyph, v });
  }
  const tape2 = parsed.map(p => p.glyph + (newRaw.get(p.glyph) ?? p.raw)).join('');
  const s2 = consider(tape2, body, parsed.map(p => ({ glyph: p.glyph, raw: newRaw.get(p.glyph) ?? p.raw })), 'tape');
  // stage 4 — induction
  parsed = chironParseTape(tape, script)!;
  let induced = 0;
  if (INDUCT > 0) {
    const have = new Set([...valuesOf(tape, parsed as any).values()]);
    const props = candidates(ref, have, INDUCT);
    const free = freeGlyphs(script, m + ref, props.length);
    for (let k = 0; k < props.length && k < free.length; k++) {
      const g = free[k]!, v = props[k]!;
      const t2 = tape + g + v;
      const p2 = chironParseTape(t2, script); if (!p2) continue;
      const e2: Entry[] = [...valuesOf(t2, p2 as any)].map(([gg, vv]) => ({ g: gg, v: vv }));
      const b2 = shortestPath(ref, e2, CTX, BEAM).body;
      if (consider(t2, b2, p2 as any, 'induct')) { induced++; parsed = chironParseTape(tape, script)!; }
    }
  }
  const ms = performance.now() - t0;
  rows.push({ path: r.path, base, after: bestTok, delta: bestTok - base, stages: [s1, s2].filter(Boolean), induced,
    rulesBefore: parsed0.length, rulesAfter: (chironParseTape(tape, script) ?? []).length, edges: edgesTotal, ms: Math.round(ms), message: best });
  console.log(`${r.path.split('/').pop()!.padEnd(22)} M=${base} -> ${bestTok} Δ=${bestTok - base} stages=${[s1, s2].filter(Boolean).join('+') || '-'} induced=${induced} rules=${parsed0.length}->${(chironParseTape(tape, script) ?? []).length} edges=${edgesTotal} ms=${Math.round(ms)}`);
}
const totalBase = rows.reduce((a, r) => a + r.base, 0), totalAfter = rows.reduce((a, r) => a + r.after, 0);
fs.mkdirSync('bench/x120/receipts', { recursive: true });
fs.writeFileSync(out + '.json', JSON.stringify({ schema: 'kompkernel-x120-veltistos2-screen-v1', src, ctx: CTX, beam: BEAM, induct: INDUCT,
  totals: { base: totalBase, after: totalAfter, delta: totalAfter - totalBase, wins: rows.filter(r => r.delta < 0).length, lanes: rows.length }, rows }, null, 2) + '\n');
fs.writeFileSync(out + '.jsonl', rows.map(r => JSON.stringify({ path: r.path, tokens: r.after, message: r.message })).join('\n') + '\n');
console.log(`TOTAL ${totalBase} -> ${totalAfter} Δ=${totalAfter - totalBase} wins=${rows.filter(r => r.delta < 0).length}/${rows.length}`);
