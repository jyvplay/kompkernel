/** X119 WIRE screen: TAPE-VALUE macro bypass. Selectively expand reference
 * windows INSIDE rule values back to literals when the fixed tokenizer prices
 * the literal window cheaper. Keeps every rule key; no new contract clause.
 * Distinct from ΔΙΑΓΡΑΦΗ (delete whole rule) and ΠΡΟΟΙΜΙΟΝ (add references).
 * ZERO encoder calls. Run: bash bench/x15/run.sh bench/x119/screen-tape-bypass.ts [messages.jsonl] [out]
 */
import * as fs from 'node:fs';
import { countTokens, type EncodingName } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, chironParseTape, chironDecode } from '../../src/lib/omega/chiron';
const enc: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, enc);
const src = process.argv[2] ?? 'bench/x117/receipts/frontier.jsonl';
const out = process.argv[3] ?? 'bench/x119/receipts/screen-tape-bypass';
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
  const vals = new Map<string, string>();
  for (const p of parsed) {
    if (p.raw.startsWith('×') || p.raw.startsWith('…')) continue;
    let v: string; try { v = chironDecode(CHIRON_START + tape + CHIRON_SEP + p.glyph); } catch { continue; }
    if (v === p.glyph || v.length > 240) continue;
    if ([...v].some(ch => chironInScript(script, ch.codePointAt(0)!))) continue;
    vals.set(p.glyph, v);
  }
  const expand = (s: string) => { let o = ''; for (const ch of s) o += vals.get(ch) ?? ch; return o; };
  type Site = { rule: number; i: number; j: number; v: string; delta: number };
  const sites: Site[] = [];
  let enumerated = 0, priced = 0;
  const raws = parsed.map(p => p.raw);
  const render = (ss: Site[]) => {
    const nr = raws.slice();
    const byRule = new Map<number, Site[]>();
    for (const s of ss) { if (!byRule.has(s.rule)) byRule.set(s.rule, []); byRule.get(s.rule)!.push(s); }
    for (const [ri, list] of byRule) {
      let s = raws[ri]!;
      for (const x of list.slice().sort((a, b) => b.i - a.i)) s = s.slice(0, x.i) + x.v + s.slice(x.j);
      nr[ri] = s;
    }
    const t = parsed.map((p, i) => p.glyph + nr[i]).join('');
    return prefix + CHIRON_START + t + CHIRON_SEP + body;
  };
  for (let ri = 0; ri < raws.length; ri++) {
    const raw = raws[ri]!; if (raw.startsWith('×') || raw.startsWith('…')) continue;
    const isG = (i: number) => vals.has(raw[i] ?? '');
    for (let i = 0; i < raw.length; i++) {
      if (!isG(i)) continue;
      for (let j = i + 1; j <= Math.min(raw.length, i + 96); j++) {
        if (!isG(j - 1)) continue;
        const seg = raw.slice(i, j); let refs = 0; for (const ch of seg) if (vals.has(ch)) refs++;
        if (refs < 1) continue;
        enumerated++;
        const v = expand(seg);
        if (T(v) > T(seg) + 1) continue;
        const cand = render([{ rule: ri, i, j, v, delta: 0 }]); priced++;
        const d = T(cand) - base;
        if (d < 0) {
          let exact = false; try { exact = chironDecode(cand.slice(w)) === ref; } catch { exact = false; }
          if (exact) sites.push({ rule: ri, i, j, v, delta: d });
        }
      }
    }
  }
  sites.sort((a, b) => a.delta - b.delta || (b.j - b.i) - (a.j - a.i) || a.rule - b.rule || a.i - b.i);
  let best = m, bestTok = base, accepted: Site[] = [];
  const overlaps = (a: Site, b: Site) => a.rule === b.rule && a.i < b.j && b.i < a.j;
  const chosen: Site[] = [];
  for (const s of sites) if (!chosen.some(c => overlaps(s, c))) chosen.push(s);
  if (chosen.length) {
    const batch = render(chosen); const bt = T(batch); priced++;
    let ok = false; try { ok = chironDecode(batch.slice(w)) === ref; } catch { ok = false; }
    if (ok && bt < bestTok) { best = batch; bestTok = bt; accepted = chosen; }
  }
  {
    let cur = m, curTok = base, acc: Site[] = [];
    for (const s of sites) {
      if (acc.some(c => overlaps(s, c))) continue;
      const trial = acc.concat([s]); const c = render(trial); const t = T(c); priced++;
      if (t >= curTok) continue;
      let ex = false; try { ex = chironDecode(c.slice(w)) === ref; } catch { ex = false; }
      if (ex) { cur = c; curTok = t; acc = trial; }
    }
    if (curTok < bestTok) { best = cur; bestTok = curTok; accepted = acc; }
  }
  const row = { path: r.path, base, after: bestTok, delta: bestTok - base, rules: parsed.length, enumerated, priced, winningWindows: sites.length, accepted: accepted.length, exact: best === m || chironDecode(best.slice(w)) === ref, message: best };
  rows.push(row);
  console.log(`${r.path.split('/').pop()!.padEnd(22)} M=${base} -> ${bestTok} Δ=${bestTok - base} enum=${enumerated} wins=${sites.length} acc=${accepted.length}`);
}
const totalBase = rows.reduce((a, r) => a + r.base, 0), totalAfter = rows.reduce((a, r) => a + r.after, 0);
fs.mkdirSync('bench/x119/receipts', { recursive: true });
fs.writeFileSync(out + '.json', JSON.stringify({ schema: 'kompkernel-x119-tape-bypass-screen-v1', note: 'completed-message screen; no encoder calls', totals: { base: totalBase, after: totalAfter, delta: totalAfter - totalBase, wins: rows.filter(r => r.delta < 0).length }, rows }, null, 2) + '\n');
fs.writeFileSync(out + '.jsonl', rows.map(r => JSON.stringify({ path: r.path, tokens: r.after, message: r.message })).join('\n') + '\n');
console.log(`TOTAL ${totalBase} -> ${totalAfter} Δ=${totalAfter - totalBase} wins=${rows.filter(r => r.delta < 0).length}/${rows.length}`);
