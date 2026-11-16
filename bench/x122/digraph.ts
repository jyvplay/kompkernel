/** X122 — the reference-alphabet cap.
 *  `chironParseTape` gives one glyph == one CHARACTER, and the Cyrillic pool has
 *  122 one-token characters, so a CHIRON wire cannot carry more than ~122 rules.
 *  bench/x121/residual.ts stops at `pool[used + it] === undefined` ("POOL
 *  EXHAUSTED"), so on ls-l-real (119/122 used) it tested at most THREE more rules.
 *  This probe prices residual rules whose key is a TWO-character Cyrillic string
 *  that is itself a single o200k token (823 available): the alphabet grows ~6.7x
 *  and the reference still costs one token. */
import * as fs from 'node:fs';
import { countTokens, encodeIds } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript } from '../../src/lib/omega/chiron';
const enc = 'o200k_base' as const;
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x122/lanes.txt', 'utf8').split('\n').filter(Boolean);
const TOPN = Number(process.env.TOPN ?? 260);
const msgs = new Map<string, string>();
for (const l of fs.readFileSync('bench/x121/receipts/ab-messages.jsonl', 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); msgs.set(r.path, r.message); }
function scriptOf(cp: number) { for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s; return null; }
// the two-character one-token keys of the Cyrillic alphabet
const KEYS: string[] = [];
{
  const pool: string[] = [];
  for (let cp = 0x0400; cp < 0x0500; cp++) { const ch = String.fromCodePoint(cp); if (encodeIds(ch, enc).length === 1) pool.push(ch); }
  for (const a of pool) for (const b of pool) { const s = a + b; if (encodeIds(s, enc).length === 1) KEYS.push(s); }
}
console.log(`two-character one-token Cyrillic keys available: ${KEYS.length}`);

for (const p of lanes) {
  const m = msgs.get(p); if (!m) continue;
  const s0 = m.indexOf(CHIRON_START), p0 = m.indexOf(CHIRON_SEP, s0 + 1);
  if (s0 < 0 || p0 < 0) continue;
  const head = m.slice(0, p0 + 1); let body = m.slice(p0 + 1);
  const tape = m.slice(s0 + 1, p0);
  const script = scriptOf(tape.codePointAt(0)!); if (!script) continue;
  const inS = (c: string) => chironInScript(script, c.codePointAt(0)!);
  const used = new Set<string>(); let i = 0;
  while (i < tape.length) { used.add(tape[i]!); let j = i + 1; while (j < tape.length && !(inS(tape[j]!) && !used.has(tape[j]!))) j++; i = j; }
  const base = countTokens(m, enc);
  // repeated substrings of the body
  const cnt = new Map<string, number>();
  const N = body.length;
  for (let L = 3; L <= 26; L++) for (let a = 0; a + L <= N; a++) { const s = body.slice(a, a + L); cnt.set(s, (cnt.get(s) ?? 0) + 1); }
  const cands: { s: string; c: number; sc: number }[] = [];
  for (const [s, c] of cnt) if (c >= 2 && [...s].length >= 3) cands.push({ s, c, sc: (c - 1) * (s.length - 2) - s.length - 3 });
  cands.sort((a, b) => b.sc - a.sc);
  console.log(`\n${p.split('/').pop()!.padEnd(16)} base ${base}; body ${N}ch; candidates ${cands.length}`);
  // price exactly: put the new rule table AFTER the body
  const taken = new Set<string>();
  let cur = base, wins = 0; const log: string[] = [];
  const table: string[] = [];
  for (const cd of cands.slice(0, TOPN)) {
    // non-overlapping occurrences
    const idx: number[] = []; let from = 0;
    for (;;) { const k = body.indexOf(cd.s, from); if (k < 0) break; idx.push(k); from = k + cd.s.length; }
    if (idx.length < 2) continue;
    const key = KEYS.find((k) => !taken.has(k) && !body.includes(k) && !head.includes(k));
    if (!key) break;
    let nb = ''; let last = 0;
    for (const k of idx) { nb += body.slice(last, k) + key; last = k + cd.s.length; }
    nb += body.slice(last);
    const nt = table.concat([key + cd.s]);
    const wire = head + nb + '\u0001' + nt.join(';');
    const t = countTokens(wire, enc);
    if (t < cur) {
      taken.add(key); table.push(key + cd.s); cur = t; wins++;
      (cd as any).applied = true;
      log.push(`${JSON.stringify(cd.s)}x${idx.length}->${(cur - base)}`);
      // continue searching on the new body
      (cd as any).nb = nb;
      // rebuild cands on the new body (cheap enough for a handful of wins)
      if (wins <= 6) { body = nb as any; }
    }
  }
  console.log(`   after ${wins} accepted digraph rules: ${cur} (Δ ${cur - base})`);
  if (log.length) console.log(`   ${log.slice(0, 12).join(' ')}`);
}
