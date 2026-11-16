/** X122 — the body as a stream of atoms: dictionary references vs literal spans.
 *  Measures reference run-lengths (how many consecutive refs) and how literal
 *  spans begin/end, which decides whether a packed code needs a fence. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript } from '../../src/lib/omega/chiron';
const enc = 'o200k_base' as const;
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x122/lanes.txt', 'utf8').split('\n').filter(Boolean);
const msgs = new Map<string, string>();
for (const l of fs.readFileSync('bench/x121/receipts/ab-messages.jsonl', 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); msgs.set(r.path, r.message); }
function scriptOf(cp: number) { for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s; return null; }
const agg: Record<string, number> = {};
for (const p of lanes) {
  const m = msgs.get(p); if (!m) continue;
  const s0 = m.indexOf(CHIRON_START), p0 = s0 >= 0 ? m.indexOf(CHIRON_SEP, s0 + 1) : -1;
  if (s0 < 0 || p0 < 0) continue;
  const tape = m.slice(s0 + 1, p0), body = m.slice(p0 + 1);
  const first = tape.codePointAt(0); const script = first === undefined ? null : scriptOf(first);
  if (!script) continue;
  const inScript = (ch: string) => chironInScript(script, ch.codePointAt(0)!);
  const glyphs = new Set<string>(); const rules: Array<{ g: string; raw: string }> = [];
  let i = 0;
  while (i < tape.length) { const g = tape[i]!; glyphs.add(g); let j = i + 1; while (j < tape.length && !(inScript(tape[j]!) && !glyphs.has(tape[j]!))) j++; rules.push({ g, raw: tape.slice(i + 1, j) }); i = j; }
  // atoms
  const atoms: Array<{ k: 'r'; g: string } | { k: 'l'; s: string }> = [];
  let cur = '';
  for (const ch of body) {
    if (glyphs.has(ch)) { if (cur) { atoms.push({ k: 'l', s: cur }); cur = ''; } atoms.push({ k: 'r', g: ch }); }
    else cur += ch;
  }
  if (cur) atoms.push({ k: 'l', s: cur });
  const nRef = atoms.filter((a) => a.k === 'r').length;
  const lits = atoms.filter((a) => a.k === 'l') as Array<{ k: 'l'; s: string }>;
  // reference runs
  const rl: number[] = []; let r = 0;
  for (const a of atoms) { if (a.k === 'r') r++; else { if (r) rl.push(r); r = 0; } }
  if (r) rl.push(r);
  const hist: Record<number, number> = {};
  for (const x of rl) hist[x] = (hist[x] ?? 0) + 1;
  const refCharsInRuns2plus = rl.filter((x) => x >= 2).reduce((a, b) => a + b, 0);
  const litStartsDigit = lits.filter((a) => /^[0-9]/.test(a.s)).length;
  const litEndsDigit = lits.filter((a) => /[0-9]$/.test(a.s)).length;
  const litOnlyDigit = lits.filter((a) => /^[0-9]+$/.test(a.s)).length;
  console.log(`${p.split('/').pop()!.padEnd(16)} rules=${String(rules.length).padStart(3)} refs=${String(nRef).padStart(4)} runs=${String(rl.length).padStart(4)} ` +
    `runlen{${Object.entries(hist).sort((a, b) => +a[0] - +b[0]).map(([k, v]) => k + ':' + v).join(',')}} ` +
    `refsInRuns>=2=${refCharsInRuns2plus} litSpans=${lits.length} startDigit=${litStartsDigit} endDigit=${litEndsDigit} allDigit=${litOnlyDigit}`);
  agg[p] = nRef;
  // entropy of refs
  const f = new Map<string, number>(); for (const a of atoms) if (a.k === 'r') f.set(a.g, (f.get(a.g) ?? 0) + 1);
  let H = 0; for (const v of f.values()) { const q = v / nRef; H -= q * Math.log2(q); }
  console.log(`   ref entropy ${H.toFixed(2)} bits; Huffman-D10 lower bound ${(H / Math.log2(10)).toFixed(2)} digits/ref = ${(H / Math.log2(10) / 3).toFixed(3)} tok/ref; at 2.0 digits/ref = ${(2 / 3).toFixed(3)} tok/ref`);
}
