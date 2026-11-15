/** X119 WIRE screen: contextual macro ADOPTION. Replace a LITERAL body occurrence
 * of an existing rule's value by that rule's glyph when the complete message gets
 * cheaper. CHIRON admits rules globally; this is per-occurrence. Keeps the tape;
 * no new contract clause. ZERO encoder calls.
 * Run: bash bench/x15/run.sh bench/x119/screen-adopt.ts [messages.jsonl] [out]
 */
import * as fs from 'node:fs';
import { countTokens, type EncodingName } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, chironParseTape, chironDecode } from '../../src/lib/omega/chiron';
const enc: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, enc);
const src = process.argv[2] ?? 'bench/x117/receipts/frontier.jsonl';
const out = process.argv[3] ?? 'bench/x119/receipts/screen-adopt';
const rows: any[] = [];
for (const line of fs.readFileSync(src, 'utf8').split('\n').filter(Boolean)) {
  const r = JSON.parse(line); let m: string = r.message;
  if (src.includes('x117') && r.path.endsWith('/ls-l-real.txt')) m = fs.readFileSync('bench/x118/receipts/regate-lsl-message.txt', 'utf8');
  const base = T(m); const w = m.indexOf(CHIRON_START), cut = m.indexOf(CHIRON_SEP, w + 1);
  if (w < 0 || cut < 0) { rows.push({ path: r.path, base, after: base, note: 'no frame' }); continue; }
  const tape = m.slice(w + 1, cut), body = m.slice(cut + 1), prefix = m.slice(0, w);
  const script = CHIRON_SCRIPTS.find(s => tape[0] && chironInScript(s, tape[0].codePointAt(0)!));
  const parsed = script ? chironParseTape(tape, script) : null;
  if (!script || !parsed) { rows.push({ path: r.path, base, after: base, note: 'bad tape' }); continue; }
  let ref: string; try { ref = chironDecode(m.slice(w)); } catch { rows.push({ path: r.path, base, after: base, note: 'bad decode' }); continue; }
  const vals: { g: string; v: string }[] = [];
  for (const p of parsed) {
    if (p.raw.startsWith('×') || p.raw.startsWith('…')) continue;
    let v: string; try { v = chironDecode(CHIRON_START + tape + CHIRON_SEP + p.glyph); } catch { continue; }
    if (v === p.glyph || v.length < 2 || v.length > 160) continue;
    if ([...v].some(ch => chironInScript(script, ch.codePointAt(0)!))) continue;
    vals.push({ g: p.glyph, v });
  }
  vals.sort((a, b) => b.v.length - a.v.length);
  type Site = { i: number; j: number; g: string; v: string; delta: number };
  const sites: Site[] = [];
  let enumerated = 0, priced = 0;
  for (const { g, v } of vals) {
    let at = body.indexOf(v);
    while (at >= 0) {
      enumerated++;
      const cand = prefix + CHIRON_START + tape + CHIRON_SEP + body.slice(0, at) + g + body.slice(at + v.length);
      priced++;
      const d = T(cand) - base;
      if (d < 0) {
        let exact = false; try { exact = chironDecode(cand.slice(w)) === ref; } catch { exact = false; }
        if (exact) sites.push({ i: at, j: at + v.length, g, v, delta: d });
      }
      at = body.indexOf(v, at + 1);
    }
  }
  sites.sort((a, b) => a.delta - b.delta || (b.j - b.i) - (a.j - a.i) || a.i - b.i);
  const render = (ss: Site[]) => {
    let b = body;
    for (const s of ss.slice().sort((a, b) => b.i - a.i)) b = b.slice(0, s.i) + s.g + b.slice(s.j);
    return prefix + CHIRON_START + tape + CHIRON_SEP + b;
  };
  let best = m, bestTok = base, accepted: Site[] = [];
  const chosen: Site[] = [];
  for (const s of sites) if (!chosen.some(c => s.i < c.j && c.i < s.j)) chosen.push(s);
  if (chosen.length) {
    const batch = render(chosen); const bt = T(batch); priced++;
    let ok = false; try { ok = chironDecode(batch.slice(w)) === ref; } catch { ok = false; }
    if (ok && bt < bestTok) { best = batch; bestTok = bt; accepted = chosen; }
  }
  {
    let cur = m, curTok = base, acc: Site[] = [];
    for (const s of sites) {
      if (acc.some(c => s.i < c.j && c.i < s.j)) continue;
      const trial = acc.concat([s]); const c = render(trial); const t = T(c); priced++;
      if (t >= curTok) continue;
      let ex = false; try { ex = chironDecode(c.slice(w)) === ref; } catch { ex = false; }
      if (ex) { cur = c; curTok = t; acc = trial; }
    }
    if (curTok < bestTok) { best = cur; bestTok = curTok; accepted = acc; }
  }
  const row = { path: r.path, base, after: bestTok, delta: bestTok - base, rules: parsed.length, enumerated, priced, winningSites: sites.length, accepted: accepted.length, exact: best === m || chironDecode(best.slice(w)) === ref, message: best };
  rows.push(row);
  console.log(`${r.path.split('/').pop()!.padEnd(22)} M=${base} -> ${bestTok} Δ=${bestTok - base} enum=${enumerated} wins=${sites.length} acc=${accepted.length}`);
}
const totalBase = rows.reduce((a, r) => a + r.base, 0), totalAfter = rows.reduce((a, r) => a + r.after, 0);
fs.mkdirSync('bench/x119/receipts', { recursive: true });
fs.writeFileSync(out + '.json', JSON.stringify({ schema: 'kompkernel-x119-adopt-screen-v1', note: 'completed-message screen; no encoder calls', totals: { base: totalBase, after: totalAfter, delta: totalAfter - totalBase, wins: rows.filter(r => r.delta < 0).length }, rows }, null, 2) + '\n');
fs.writeFileSync(out + '.jsonl', rows.map(r => JSON.stringify({ path: r.path, tokens: r.after, message: r.message })).join('\n') + '\n');
console.log(`TOTAL ${totalBase} -> ${totalAfter} Δ=${totalAfter - totalBase} wins=${rows.filter(r => r.delta < 0).length}/${rows.length}`);
