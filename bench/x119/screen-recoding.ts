/** X119 WIRE screen: OCCURRENCE-LEVEL RECODING (adopt + bypass, body + tape).
 * Unified per-occurrence dictionary judgment on a finished CHIRON wire:
 *  ADOPT: literal body span equal to an existing flat rule value -> its glyph.
 *  BYPASS: body/tape window containing references -> its literal expansion.
 * Every move keeps the rule set and adds NO contract clause. ZERO encoder calls.
 * Run: bash bench/x15/run.sh bench/x119/screen-recoding.ts [messages.jsonl] [out]
 */
import * as fs from 'node:fs';
import { countTokens, type EncodingName } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, chironParseTape, chironDecode } from '../../src/lib/omega/chiron';
const enc: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, enc);
const src = process.argv[2] ?? 'bench/x117/receipts/frontier.jsonl';
const out = process.argv[3] ?? 'bench/x119/receipts/screen-recoding';
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
  type Site = { dom: 'body' | 'tape'; rule: number; i: number; j: number; rep: string; delta: number; kind: 'adopt' | 'bypass' };
  const sites: Site[] = [];
  let enumerated = 0, priced = 0;
  const raws = parsed.map(p => p.raw);
  const render = (ss: Site[]) => {
    let b = body; const nr = raws.slice();
    const bodySites = ss.filter(s => s.dom === 'body').sort((a, b) => b.i - a.i);
    for (const s of bodySites) b = b.slice(0, s.i) + s.rep + b.slice(s.j);
    const byRule = new Map<number, Site[]>();
    for (const s of ss) if (s.dom === 'tape') { if (!byRule.has(s.rule)) byRule.set(s.rule, []); byRule.get(s.rule)!.push(s); }
    for (const [ri, list] of byRule) { let s = raws[ri]!; for (const x of list.slice().sort((a, b) => b.i - a.i)) s = s.slice(0, x.i) + x.rep + s.slice(x.j); nr[ri] = s; }
    const t = parsed.map((p, i) => p.glyph + nr[i]).join('');
    return prefix + CHIRON_START + t + CHIRON_SEP + b;
  };
  const price = (s: Site) => { const c = render([s]); priced++; return T(c) - base; };
  // ADOPT: literal body occurrences of flat rule values.
  for (const [g, v] of vals) {
    if (v.length < 2) continue;
    let at = body.indexOf(v);
    while (at >= 0) {
      enumerated++;
      const s: Site = { dom: 'body', rule: -1, i: at, j: at + v.length, rep: g, delta: 0, kind: 'adopt' };
      const d = price(s);
      if (d < 0) { s.delta = d; let ex = false; try { ex = chironDecode(render([s]).slice(w)) === ref; } catch { ex = false; } if (ex) sites.push(s); }
      at = body.indexOf(v, at + 1);
    }
  }
  // BYPASS body windows (>=2 refs).
  const isGB = (i: number) => vals.has(body[i] ?? '');
  for (let i = 0; i < body.length; i++) {
    if (!isGB(i)) continue;
    for (let j = i + 2; j <= Math.min(body.length, i + 96); j++) {
      if (!isGB(j - 1)) continue;
      const seg = body.slice(i, j); let refs = 0; for (const ch of seg) if (vals.has(ch)) refs++;
      if (refs < 2) continue; enumerated++;
      const v = expand(seg); if (T(v) > T(seg) + 1) continue;
      const s: Site = { dom: 'body', rule: -1, i, j, rep: v, delta: 0, kind: 'bypass' };
      const d = price(s);
      if (d < 0) { s.delta = d; let ex = false; try { ex = chironDecode(render([s]).slice(w)) === ref; } catch { ex = false; } if (ex) sites.push(s); }
    }
  }
  // BYPASS tape windows (>=1 ref).
  for (let ri = 0; ri < raws.length; ri++) {
    const raw = raws[ri]!; if (raw.startsWith('×') || raw.startsWith('…')) continue;
    const isG = (i: number) => vals.has(raw[i] ?? '');
    for (let i = 0; i < raw.length; i++) {
      if (!isG(i)) continue;
      for (let j = i + 1; j <= Math.min(raw.length, i + 96); j++) {
        if (!isG(j - 1)) continue;
        const seg = raw.slice(i, j); let refs = 0; for (const ch of seg) if (vals.has(ch)) refs++;
        if (refs < 1) continue; enumerated++;
        const v = expand(seg); if (T(v) > T(seg) + 1) continue;
        const s: Site = { dom: 'tape', rule: ri, i, j, rep: v, delta: 0, kind: 'bypass' };
        const d = price(s);
        if (d < 0) { s.delta = d; let ex = false; try { ex = chironDecode(render([s]).slice(w)) === ref; } catch { ex = false; } if (ex) sites.push(s); }
      }
    }
  }
  sites.sort((a, b) => a.delta - b.delta || (b.j - b.i) - (a.j - a.i) || a.dom.localeCompare(b.dom) || a.rule - b.rule || a.i - b.i);
  const overlaps = (a: Site, b: Site) => a.dom === b.dom && a.rule === b.rule && a.i < b.j && b.i < a.j;
  let best = m, bestTok = base, accepted: Site[] = [];
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
  const row = { path: r.path, base, after: bestTok, delta: bestTok - base, rules: parsed.length, enumerated, priced,
    winningSites: sites.length, adoptWins: sites.filter(s => s.kind === 'adopt').length, bypassWins: sites.filter(s => s.kind === 'bypass').length,
    accepted: accepted.length, acceptedAdopt: accepted.filter(s => s.kind === 'adopt').length, acceptedBypass: accepted.filter(s => s.kind === 'bypass').length,
    exact: best === m || chironDecode(best.slice(w)) === ref, message: best };
  rows.push(row);
  console.log(`${r.path.split('/').pop()!.padEnd(22)} M=${base} -> ${bestTok} Δ=${bestTok - base} enum=${enumerated} wins=${sites.length} acc=${accepted.length} (A${accepted.filter(s => s.kind === 'adopt').length}/B${accepted.filter(s => s.kind === 'bypass').length})`);
}
const totalBase = rows.reduce((a, r) => a + r.base, 0), totalAfter = rows.reduce((a, r) => a + r.after, 0);
fs.mkdirSync('bench/x119/receipts', { recursive: true });
fs.writeFileSync(out + '.json', JSON.stringify({ schema: 'kompkernel-x119-recoding-screen-v1', note: 'completed-message screen; no encoder calls', totals: { base: totalBase, after: totalAfter, delta: totalAfter - totalBase, wins: rows.filter(r => r.delta < 0).length }, rows }, null, 2) + '\n');
fs.writeFileSync(out + '.jsonl', rows.map(r => JSON.stringify({ path: r.path, tokens: r.after, message: r.message })).join('\n') + '\n');
console.log(`TOTAL ${totalBase} -> ${totalAfter} Δ=${totalAfter - totalBase} wins=${rows.filter(r => r.delta < 0).length}/${rows.length}`);
