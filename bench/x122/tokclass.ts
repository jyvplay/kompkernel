/** X122 — per-token class census of the shipped body. Each o200k token is
 *  classified by what it is made of, so the body cost is attributable. */
import * as fs from 'node:fs';
import { tokenStrings } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript } from '../../src/lib/omega/chiron';
const enc = 'o200k_base' as const;
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x122/lanes.txt', 'utf8').split('\n').filter(Boolean);
const msgs = new Map<string, string>();
for (const l of fs.readFileSync('bench/x121/receipts/ab-messages.jsonl', 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); msgs.set(r.path, r.message); }
function scriptOf(cp: number) { for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s; return null; }
const tot: Record<string, number> = {}; const totCh: Record<string, number> = {};
for (const p of lanes) {
  const m = msgs.get(p); if (!m) continue;
  const s0 = m.indexOf(CHIRON_START), p0 = s0 >= 0 ? m.indexOf(CHIRON_SEP, s0 + 1) : -1;
  if (s0 < 0 || p0 < 0) continue;
  const tape = m.slice(s0 + 1, p0), body = m.slice(p0 + 1);
  const first = tape.codePointAt(0); const script = first === undefined ? null : scriptOf(first);
  const glyphs = new Set<string>();
  if (script) { let i = 0; while (i < tape.length) { glyphs.add(tape[i]!); let j = i + 1; while (j < tape.length && !(chironInScript(script, tape[j]!.codePointAt(0)!) && !glyphs.has(tape[j]!))) j++; i = j; } }
  const c: Record<string, number> = {}; const ch: Record<string, number> = {};
  for (const t of tokenStrings(body, enc)) {
    const s = t.s; const chars = [...s];
    let k: string;
    if (chars.every((x) => glyphs.has(x))) k = 'ALL-glyph';
    else if (chars.every((x) => /[0-9]/.test(x))) k = 'ALL-digit';
    else if (chars.every((x) => /\s/.test(x))) k = 'ALL-space';
    else if (chars.some((x) => glyphs.has(x))) k = 'MIX-glyph';
    else if (chars.some((x) => /[0-9]/.test(x))) k = 'MIX-digit';
    else if (/^\s/.test(s) || /\s$/.test(s)) k = 'MIX-space';
    else k = 'plain';
    c[k] = (c[k] ?? 0) + 1; ch[k] = (ch[k] ?? 0) + s.length;
    tot[k] = (tot[k] ?? 0) + 1; totCh[k] = (totCh[k] ?? 0) + s.length;
  }
  const bodyTok = Object.values(c).reduce((a, b) => a + b, 0);
  console.log(`${p.split('/').pop()!.padEnd(16)} body ${body.length}ch ${bodyTok}tok  ` +
    Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}(${(v / bodyTok * 100).toFixed(0)}%)`).join(' '));
  const dg = (c['ALL-digit'] ?? 0) + (c['MIX-digit'] ?? 0);
  console.log(`   digit-bearing tokens ${dg} (${(dg / bodyTok * 100).toFixed(0)}%); digit chars in body ${(body.match(/[0-9]/g) ?? []).length}`);
}
console.log('\nTOTAL ' + Object.entries(tot).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' '));
console.log('TOTAL chars ' + Object.entries(totCh).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' '));
