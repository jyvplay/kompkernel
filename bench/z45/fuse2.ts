import fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc = (process.env.ENC || 'o200k_base') as any;
// Rules: [name, site regex (global), exception regex, fuse fn]
// Site = original " X" pattern; exception = pattern in original that the decoder's inverse would wrongly touch.
type Rule = { name: string; site: RegExp; exc: RegExp; fuse: (m: RegExpExecArray) => string };
const RULES: Rule[] = [
  { name: 'P', site: /([.!?]) (?=[A-Z])/g, exc: /[.!?][A-Z]/g, fuse: m => m[1] },
  { name: 'C', site: /, (?=[a-z])/g, exc: /,[a-z]/g, fuse: () => ',' },
  { name: 'O', site: /(?<=[A-Za-z0-9,.;:]) \((?=[A-Za-z])/g, exc: /[A-Za-z0-9,.;:]\([A-Za-z]/g, fuse: () => '(' },
  { name: 'Q', site: /(?<=[A-Za-z0-9,.;:]) "(?=[A-Za-z])/g, exc: /[A-Za-z0-9,.;:]"[A-Za-z]/g, fuse: () => '"' },
  { name: 'D', site: / — /g, exc: /(?<! )—|—(?! )/g, fuse: () => '—' },
];
// split into fenced / unfenced segments (``` lines toggle)
function segments(t: string): { s: string; code: boolean }[] {
  const out: { s: string; code: boolean }[] = [];
  let code = false, buf = '';
  for (const line of t.split(/(?<=\n)/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      if (buf) out.push({ s: buf, code }); buf = '';
      out.push({ s: line, code: true }); code = !code; continue;
    }
    buf += line;
  }
  if (buf) out.push({ s: buf, code });
  return out;
}
const agg: Record<string, { gainAll: number; gainPos: number; gainFence: number; filesAll: number; filesFence: number }> = {};
let totIn = 0;
const files = process.argv.slice(2);
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const inTok = countTokens(t, enc); totIn += inTok;
  const segs = segments(t);
  const line: string[] = [];
  for (const r of RULES) {
    const a = (agg[r.name] ||= { gainAll: 0, gainPos: 0, gainFence: 0, filesAll: 0, filesFence: 0 });
    // per-site positive-only fusion within a string
    const fusePos = (s: string): { out: string; gain: number; sites: number } => {
      let out = '', last = 0, gain = 0, sites = 0; let m: RegExpExecArray | null; r.site.lastIndex = 0;
      while ((m = r.site.exec(s))) {
        const ctx0 = s.slice(Math.max(0, m.index - 12), m.index), ctx1 = s.slice(m.index + m[0].length, m.index + m[0].length + 12);
        const g = countTokens(ctx0 + m[0] + ctx1, enc) - countTokens(ctx0 + r.fuse(m) + ctx1, enc);
        sites++;
        if (g > 0) { out += s.slice(last, m.index) + r.fuse(m); last = m.index + m[0].length; gain += g; }
      }
      out += s.slice(last);
      return { out, gain, sites };
    };
    // (a) whole-message gating, all sites fused
    const excAll = (t.match(r.exc) || []).length;
    const allFused = t.replace(r.site, (...args) => r.fuse(args as any));
    const gAll = excAll ? 0 : inTok - countTokens(allFused, enc);
    // (b) whole-message gating, positive sites only
    const pos = fusePos(t);
    const gPos = excAll ? 0 : inTok - countTokens(pos.out, enc);
    // (c) fence-aware: exceptions counted outside fences only; fusion outside fences only
    let excOut = 0, outF = '';
    for (const sg of segs) { if (sg.code) { outF += sg.s; continue; } excOut += (sg.s.match(r.exc) || []).length; outF += fusePos(sg.s).out; }
    const gF = excOut ? 0 : inTok - countTokens(outF, enc);
    a.gainAll += gAll; a.gainPos += gPos; a.gainFence += gF; if (gAll > 0) a.filesAll++; if (gF > 0) a.filesFence++;
    line.push(`${r.name}:${gAll}/${gPos}/${gF}(x${excAll}/${excOut})`);
  }
  console.log(f.split('/').slice(-1)[0].padEnd(36) + ` in=${String(inTok).padEnd(6)} ` + line.join(' '));
}
console.log(`\nAGG files=${files.length} in=${totIn}  (gain: all-sites / positive-sites / fence-aware)`);
for (const [k, a] of Object.entries(agg)) console.log(`  ${k}: all=${a.gainAll} pos=${a.gainPos} fence=${a.gainFence} filesWin=${a.filesAll}/${a.filesFence}`);
