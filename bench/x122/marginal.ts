/**
 * X122 — marginal cost census of the shipped BODY.
 *
 * Replaces one category of characters at a time by nothing (or by a fixed
 * one-token stand-in) and measures the token delta on the real tokenizer. This
 * is the only honest way to say "digit runs cost N tokens" — counting the
 * characters tells you nothing, because o200k chunks digits into groups of <=3
 * and merges whitespace runs.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, type ChironScript } from '../../src/lib/omega/chiron';

const enc = 'o200k_base' as const;
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x122/lanes.txt', 'utf8').split('\n').filter(Boolean);
const msgs = new Map<string, string>();
for (const l of fs.readFileSync('bench/x121/receipts/ab-messages.jsonl', 'utf8').split('\n').filter(Boolean)) {
  const r = JSON.parse(l); msgs.set(r.path, r.message);
}
function scriptOf(cp: number) { for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s; return null; }
const isDig = (c: string) => c >= '0' && c <= '9';
const isWs = (c: string) => /\s/.test(c);

for (const p of lanes) {
  const m = msgs.get(p); if (m === undefined) continue;
  const s0 = m.indexOf(CHIRON_START), p0 = s0 >= 0 ? m.indexOf(CHIRON_SEP, s0 + 1) : -1;
  if (s0 < 0 || p0 < 0) continue;
  const tape = m.slice(s0 + 1, p0), body = m.slice(p0 + 1);
  const first = tape.codePointAt(0); const script = first === undefined ? null : scriptOf(first);
  const glyphs = new Set<string>();
  if (script) for (const c of tape) if (chironInScript(script, c.codePointAt(0)!)) glyphs.add(c);
  const base = countTokens(body, enc);
  const drop = (pred: (c: string) => boolean) => base - countTokens([...body].filter((c) => !pred(c)).join(''), enc);
  const keep = (pred: (c: string) => boolean) => countTokens([...body].filter(pred).join(''), enc);
  let nD = 0, nW = 0, nG = 0, nO = 0;
  for (const c of body) { if (glyphs.has(c)) nG++; else if (isDig(c)) nD++; else if (isWs(c)) nW++; else nO++; }
  console.log(`\n${p}  body ${body.length} chars / ${base} tokens`);
  console.log(`  chars: glyph ${nG}  digits ${nD}  whitespace ${nW}  other ${nO}`);
  console.log(`  marginal tokens: glyph ${drop((c) => glyphs.has(c))}  digits ${drop(isDig)}  whitespace ${drop(isWs)}  other ${drop((c) => !glyphs.has(c) && !isDig(c) && !isWs(c))}`);
  console.log(`  alone:  glyph ${keep((c) => glyphs.has(c))}  digits ${keep(isDig)}  whitespace ${keep(isWs)}  other ${keep((c) => !glyphs.has(c) && !isDig(c) && !isWs(c))}`);
  // digit-run census
  const runs = body.match(/\d+/g) ?? [];
  const rc = new Map<string, number>(); for (const r of runs) rc.set(r, (rc.get(r) ?? 0) + 1);
  let cost = 0; const byLen = new Map<number, [number, number]>();
  for (const r of runs) { const t = countTokens(r, enc); cost += t; const e = byLen.get(r.length) ?? [0, 0]; e[0]++; e[1] += t; byLen.set(r.length, e); }
  console.log(`  digit runs: ${runs.length} runs, ${nD} chars, ${cost} tokens if run-tokenized alone; per-length: ${[...byLen].sort((a, b) => a[0] - b[0]).map(([L, [n, t]]) => `L${L}:${n}x${(t / n).toFixed(2)}`).join(' ')}`);
}
