/**
 * X120 screen — ΒΕΛΤΙΣΤΟΣ: GLOBAL SHORTEST-PATH RE-SPELLING of a finished wire.
 *
 * Every shipped dictionary codec replaces a span at ALL of its occurrences (the
 * rule is admitted globally) and every shipped wire pass moves one site at a
 * time. This screen asks the global question instead: given the FINAL rule set,
 * what is the cheapest spelling of the decoded body as an interleaving of literal
 * text and rule glyphs? That is a shortest path in a DAG whose nodes are body
 * positions and whose edges are "emit one literal character" or "emit one glyph".
 *
 * Edge cost is the exact marginal tokenizer cost in the emitted left context:
 *     cost(piece | ctx) = T(ctx + piece) - T(ctx)
 * with ctx = the last CTX characters actually emitted. BPE merges live inside a
 * pre-tokenizer chunk, so this is exact whenever no chunk reaches back more than
 * CTX characters; the DP is therefore a *proposal* and the admission gate is the
 * real whole-message price plus chironDecode equality. Zero encoder calls.
 *
 * Run: bash bench/x15/run.sh bench/x120/screen-veltistos.ts [messages.jsonl] [out]
 */
import * as fs from 'node:fs';
import { countTokens, type EncodingName } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, chironParseTape, chironDecode } from '../../src/lib/omega/chiron';

const enc: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, enc);
const src = process.argv[2] ?? 'bench/x119/receipts/final-frontier.jsonl';
const out = process.argv[3] ?? 'bench/x120/receipts/screen-veltistos';
const CTX = Number(process.env.X120_CTX ?? 12);
const BEAM = Number(process.env.X120_BEAM ?? 3);
const MAX_MATCH = 12;
const EDGE_CAP = 2_000_000;

interface Entry { g: string; v: string }
interface State { ctx: string; ctxTok: number; cost: number; bi: number; bs: number; piece: string }

function shortestPath(ref: string, byFirst: Map<string, Entry[]>, ctxLen: number, beam: number): { body: string; model: number; edges: number } {
  const N = ref.length;
  const dp: State[][] = Array.from({ length: N + 1 }, () => []);
  dp[0] = [{ ctx: '', ctxTok: 0, cost: 0, bi: -1, bs: -1, piece: '' }];
  let edges = 0;
  const push = (j: number, s: State) => {
    const arr = dp[j];
    for (let k = 0; k < arr.length; k++) {
      if (arr[k].ctx === s.ctx) { if (s.cost < arr[k].cost) arr[k] = s; return; }
    }
    arr.push(s);
  };
  for (let i = 0; i < N; i++) {
    const arr = dp[i];
    if (!arr.length) continue;
    arr.sort((a, b) => a.cost - b.cost);
    if (arr.length > beam) arr.length = beam;
    const matches = (byFirst.get(ref[i]!) ?? []).filter(e => ref.startsWith(e.v, i)).slice(0, MAX_MATCH);
    for (let si = 0; si < arr.length; si++) {
      const s = arr[si];
      const pieces: Array<[string, number]> = [[ref[i]!, i + 1]];
      for (const e of matches) pieces.push([e.g, i + e.v.length]);
      for (const [piece, j] of pieces) {
        if (edges++ > EDGE_CAP) break;
        const joined = s.ctx + piece;
        const cost = s.cost + T(joined) - s.ctxTok;
        const ctx = ctxLen > 0 ? joined.slice(-ctxLen) : '';
        push(j, { ctx, ctxTok: ctx ? T(ctx) : 0, cost, bi: i, bs: si, piece });
      }
    }
  }
  const last = dp[N];
  if (!last.length) return { body: '', model: Infinity, edges };
  last.sort((a, b) => a.cost - b.cost);
  let bi = N, bs = 0, parts: string[] = [];
  while (bi > 0) { const s = dp[bi][bs]!; parts.push(s.piece); bi = s.bi; bs = s.bs; }
  parts.reverse();
  return { body: parts.join(''), model: last[0].cost, edges };
}

/** Delete rules no longer reachable from the body (whole-rule deletion is ΔΙΑΓΡΑΦΗ's; here it is a consequence of re-spelling). */
function pruneTape(tape: string, body: string, parsed: { glyph: string; raw: string }[]): string {
  const rawOf = new Map(parsed.map(p => [p.glyph, p.raw]));
  const keys = new Set(parsed.map(p => p.glyph));
  const live = new Set<string>();
  const stack: string[] = [];
  for (const ch of body) if (keys.has(ch) && !live.has(ch)) { live.add(ch); stack.push(ch); }
  while (stack.length) {
    const g = stack.pop()!;
    for (const ch of rawOf.get(g) ?? '') if (keys.has(ch) && !live.has(ch)) { live.add(ch); stack.push(ch); }
  }
  return parsed.filter(p => live.has(p.glyph)).map(p => p.glyph + p.raw).join('');
}

const rows: any[] = [];
const lines = fs.readFileSync(src, 'utf8').split('\n').filter(Boolean);
for (const line of lines) {
  const r = JSON.parse(line);
  const m: string = r.message;
  const base = T(m);
  const w = m.indexOf(CHIRON_START), cut = m.indexOf(CHIRON_SEP, w + 1);
  const skip = (note: string) => { rows.push({ path: r.path, base, after: base, delta: 0, note }); console.log(`${r.path.split('/').pop()!.padEnd(22)} M=${base} SKIP ${note}`); };
  if (w < 0 || cut < 0) { skip('no frame'); continue; }
  const prefix = m.slice(0, w), tape = m.slice(w + 1, cut), body = m.slice(cut + 1);
  const script = CHIRON_SCRIPTS.find(s => tape[0] && chironInScript(s, tape[0].codePointAt(0)!));
  const parsed = script ? chironParseTape(tape, script) : null;
  if (!script || !parsed || !parsed.length) { skip('bad tape'); continue; }
  let ref: string;
  try { ref = chironDecode(m.slice(w)); } catch { skip('decode threw'); continue; }
  if (ref.length > 60_000) { skip('too long'); continue; }
  const entries: Entry[] = [];
  for (const p of parsed) {
    let v: string;
    try { v = chironDecode(CHIRON_START + tape + CHIRON_SEP + p.glyph); } catch { continue; }
    if (!v || v === p.glyph || v.length > 4000) continue;
    entries.push({ g: p.glyph, v });
  }
  // MODEL SELF-CHECK: expanding the ORIGINAL body through this dictionary must
  // reproduce chironDecode. If an operator is context-sensitive the model is
  // wrong and the lane is reported, not silently optimised.
  const map = new Map(entries.map(e => [e.g, e.v]));
  let flat = body, iter = 0;
  while (iter++ < 40) { let next = ''; let changed = false; for (const ch of flat) { const v = map.get(ch); if (v !== undefined) { next += v; changed = true; } else next += ch; } flat = next; if (!changed) break; }
  const modelOk = flat === ref;
  const byFirst = new Map<string, Entry[]>();
  for (const e of entries) { const k = e.v[0]!; if (!byFirst.has(k)) byFirst.set(k, []); byFirst.get(k)!.push(e); }
  for (const list of byFirst.values()) list.sort((a, b) => b.v.length - a.v.length);
  const t0 = performance.now();
  const a = shortestPath(ref, byFirst, CTX, BEAM);
  const b = CTX === 0 ? a : shortestPath(ref, byFirst, 0, 1);
  const ms = performance.now() - t0;
  let best = m, bestTok = base, via = 'parent', chosenBody = body;
  for (const [tag, cand] of [['dp', a], ['additive', b]] as const) {
    if (!cand.body) continue;
    const nt = pruneTape(tape, cand.body, parsed as any);
    const m2 = prefix + CHIRON_START + nt + CHIRON_SEP + cand.body;
    const tok = T(m2);
    if (tok >= bestTok) continue;
    let ok = false; try { ok = chironDecode(m2.slice(w)) === ref; } catch { ok = false; }
    if (!ok) continue;
    best = m2; bestTok = tok; via = tag; chosenBody = cand.body;
  }
  const row = { path: r.path, base, after: bestTok, delta: bestTok - base, via, rules: parsed.length,
    entries: entries.length, refChars: ref.length, bodyChars: body.length, newBodyChars: chosenBody.length,
    modelOk, edges: a.edges, modelCost: a.model, ms: Math.round(ms), message: best };
  rows.push(row);
  console.log(`${r.path.split('/').pop()!.padEnd(22)} M=${base} -> ${bestTok} Δ=${bestTok - base} via=${via} rules=${parsed.length} model=${modelOk} edges=${a.edges} ms=${Math.round(ms)}`);
}
const totalBase = rows.reduce((a, r) => a + r.base, 0), totalAfter = rows.reduce((a, r) => a + r.after, 0);
fs.mkdirSync('bench/x120/receipts', { recursive: true });
fs.writeFileSync(out + '.json', JSON.stringify({ schema: 'kompkernel-x120-veltistos-screen-v1', src, ctx: CTX, beam: BEAM,
  note: 'completed-message screen; zero encoder calls; gate = whole-message price + chironDecode equality',
  totals: { base: totalBase, after: totalAfter, delta: totalAfter - totalBase, wins: rows.filter(r => r.delta < 0).length, lanes: rows.length }, rows }, null, 2) + '\n');
fs.writeFileSync(out + '.jsonl', rows.map(r => JSON.stringify({ path: r.path, tokens: r.after, message: r.message })).join('\n') + '\n');
console.log(`TOTAL ${totalBase} -> ${totalAfter} Δ=${totalAfter - totalBase} wins=${rows.filter(r => r.delta < 0).length}/${rows.length}`);
