/** X119 raw WIRE screen: selective occurrence inlining in an already-shipped
 * CHIRON dictionary. Unlike ΔΙΑΓΡΑΦΗ (delete a rule and inline ALL its users),
 * this keeps the rule and inlines only individually expensive body references.
 * No new decoder clause is needed: literals already pass through unchanged.
 * Reads completed messages; ZERO encoder calls. Every accepted batch is priced
 * as a COMPLETE message and checked with chironDecode against the incumbent.
 * Run: bash bench/x15/run.sh bench/x119/screen-inline.ts [messages.jsonl] [out]
 */
import * as fs from 'node:fs';
import { countTokens, type EncodingName } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, chironParseTape, chironDecode } from '../../src/lib/omega/chiron';
const enc: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, enc);
const src = process.argv[2] ?? 'bench/x117/receipts/frontier.jsonl';
const out = process.argv[3] ?? 'bench/x119/receipts/screen-inline';
const rows: any[] = [];
for (const line of fs.readFileSync(src, 'utf8').split('\n').filter(Boolean)) {
  const r = JSON.parse(line);
  let m: string = r.message;
  // The X117 frontier receipt predates the X118 ls-l-real re-gate. Use the
  // shipped fused message for that one lane; all other 28 messages are identical.
  if (src.includes('x117') && r.path.endsWith('/ls-l-real.txt')) m = fs.readFileSync('bench/x118/receipts/regate-lsl-message.txt', 'utf8');
  const base = T(m);
  const w = m.indexOf(CHIRON_START), cut = m.indexOf(CHIRON_SEP, w + 1);
  if (w < 0 || cut < 0) { rows.push({ path: r.path, base, after: base, note: 'no frame' }); continue; }
  const tape = m.slice(w + 1, cut), body = m.slice(cut + 1), prefix = m.slice(0, w);
  const script = CHIRON_SCRIPTS.find(s => tape[0] && chironInScript(s, tape[0].codePointAt(0)!));
  const parsed = script ? chironParseTape(tape, script) : null;
  if (!script || !parsed) { rows.push({ path: r.path, base, after: base, note: 'bad tape' }); continue; }
  let ref: string;
  try { ref = chironDecode(m.slice(w)); } catch { rows.push({ path: r.path, base, after: base, note: 'bad decode' }); continue; }
  const vals = new Map<string, string>();
  for (const p of parsed) {
    if (p.raw.startsWith('×') || p.raw.startsWith('…')) continue;
    let v: string;
    try { v = chironDecode(CHIRON_START + tape + CHIRON_SEP + p.glyph); } catch { continue; }
    if (v === p.glyph || v.length < 2 || v.length > 160) continue;
    if ([...v].some(ch => chironInScript(script, ch.codePointAt(0)!))) continue;
    vals.set(p.glyph, v);
  }
  type Site = { at: number; g: string; v: string; delta: number };
  const sites: Site[] = [];
  let priced = 0, singleWins = 0, singleSum = 0;
  for (let i = 0; i < body.length; i++) {
    const g = body[i]!, v = vals.get(g); if (!v) continue;
    const cand = prefix + CHIRON_START + tape + CHIRON_SEP + body.slice(0, i) + v + body.slice(i + 1);
    priced++;
    const d = T(cand) - base;
    if (d < 0) {
      let exact = false; try { exact = chironDecode(cand.slice(w)) === ref; } catch { exact = false; }
      if (exact) { sites.push({ at: i, g, v, delta: d }); singleWins++; singleSum += d; }
    }
  }
  // Greedy batch: apply the best non-overlapping single-site wins from right to
  // left, then re-price. If the batch interacts badly, fall back to adding one
  // site at a time (still whole-message priced and decode-gated).
  sites.sort((a, b) => a.delta - b.delta || a.at - b.at);
  const chosen: Site[] = [];
  for (const s of sites) if (!chosen.some(c => c.at === s.at)) chosen.push(s);
  const render = (ss: Site[]) => {
    let b = body;
    for (const s of ss.slice().sort((a, b) => b.at - a.at)) b = b.slice(0, s.at) + s.v + b.slice(s.at + 1);
    return prefix + CHIRON_START + tape + CHIRON_SEP + b;
  };
  let best = m, bestTok = base, accepted: Site[] = [];
  if (chosen.length) {
    const batch = render(chosen); const bt = T(batch);
    let ok = false; try { ok = chironDecode(batch.slice(w)) === ref; } catch { ok = false; }
    if (ok && bt < bestTok) { best = batch; bestTok = bt; accepted = chosen; }
    else {
      for (const s of chosen) {
        const trial = accepted.concat([s]); const c = render(trial); const t = T(c); priced++;
        if (t >= bestTok) continue;
        let ex = false; try { ex = chironDecode(c.slice(w)) === ref; } catch { ex = false; }
        if (ex) { best = c; bestTok = t; accepted = trial; }
      }
    }
  }
  const row = { path: r.path, base, after: bestTok, delta: bestTok - base, rules: parsed.length, flatRules: vals.size,
    sites: sites.length, singleWins, singleSum, accepted: accepted.length, priced, exact: best === m || chironDecode(best.slice(w)) === ref,
    examples: sites.slice(0, 8).map(s => ({ at: s.at, g: s.g, v: s.v, delta: s.delta })), message: best };
  rows.push(row);
  console.log(`${r.path.split('/').pop()!.padEnd(22)} M=${base} -> ${bestTok} Δ=${bestTok - base} sites=${sites.length} singleSum=${singleSum} accepted=${accepted.length} priced=${priced}`);
}
const totalBase = rows.reduce((a, r) => a + r.base, 0), totalAfter = rows.reduce((a, r) => a + r.after, 0);
fs.mkdirSync('bench/x119/receipts', { recursive: true });
fs.writeFileSync(out + '.json', JSON.stringify({ schema: 'kompkernel-x119-inline-screen-v1', note: 'completed-message screen; no encoder calls; singleSum is NOT additive evidence', totals: { base: totalBase, after: totalAfter, delta: totalAfter - totalBase, wins: rows.filter(r => r.delta < 0).length }, rows }, null, 2) + '\n');
fs.writeFileSync(out + '.jsonl', rows.map(r => JSON.stringify({ path: r.path, tokens: r.after, message: r.message })).join('\n') + '\n');
console.log(`TOTAL ${totalBase} -> ${totalAfter} Δ=${totalAfter - totalBase} wins=${rows.filter(r => r.delta < 0).length}/${rows.length}`);
