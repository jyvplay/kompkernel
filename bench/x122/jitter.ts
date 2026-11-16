/** X122 — boundary relaxation on an existing tape.
 *  The tape's literal content measures 0.414 tok/char while the body's plain text
 *  measures 0.275: dictionary values are FRAGMENTS, and a fragment tokenises worse
 *  than running text. Trimming k characters off the head/tail of a rule's value and
 *  re-emitting them at every use site in the body is decode-identical by construction,
 *  so the whole-wire token count decides. Existing miners only enumerate
 *  token-ALIGNED spans, so this move is not in their search space. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, chironDecode, type ChironScript } from '../../src/lib/omega/chiron';
const enc = 'o200k_base' as const;
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x122/lanes.txt', 'utf8').split('\n').filter(Boolean);
const MAXK = Number(process.env.MAXK ?? 4);
const msgs = new Map<string, string>();
for (const l of fs.readFileSync('bench/x121/receipts/ab-messages.jsonl', 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); msgs.set(r.path, r.message); }
function scriptOf(cp: number) { for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s; return null; }

interface St { rules: { g: string; v: string }[]; body: string; prefix: string; }
function parseTape(m: string) {
  const s0 = m.indexOf(CHIRON_START), p0 = m.indexOf(CHIRON_SEP, s0 + 1);
  const prefix = m.slice(0, s0 + 1), tape = m.slice(s0 + 1, p0), body = m.slice(p0 + 1);
  const script = scriptOf(tape.codePointAt(0)!); if (!script) return null;
  const inS = (c: string) => chironInScript(script, c.codePointAt(0)!);
  const used = new Set<string>(); const rules: { g: string; v: string }[] = [];
  let i = 0;
  while (i < tape.length) { const g = tape[i]!; used.add(g); let j = i + 1; while (j < tape.length && !(inS(tape[j]!) && !used.has(tape[j]!))) j++; rules.push({ g, v: tape.slice(i + 1, j) }); i = j; }
  return { rules, body, prefix } as St;
}
function render(st: St) {
  let tape = '', body = '';
  for (const r of st.rules) tape += r.g + r.v;
  // body: expand rule values in the SAME iterative way chironDecode would
  // (body refs point at rules; each ref is replaced by head + glyph + tail)
  const heads = new Map<string, string>(); const tails = new Map<string, string>();
  for (const r of st.rules) { heads.set(r.g, (r as any).h ?? ''); tails.set(r.g, (r as any).t ?? ''); }
  for (const ch of st.body) {
    const g = ch;
    if (heads.has(g)) body += heads.get(g) + g + tails.get(g);
    else body += ch;
  }
  return st.prefix + tape + CHIRON_SEP + body;
}
for (const p of lanes) {
  const m = msgs.get(p); if (!m) continue;
  const st0 = parseTape(m); if (!st0) continue;
  const base = countTokens(m, enc);
  let st: St = { rules: st0.rules.map((r) => ({ g: r.g, v: r.v })), body: st0.body, prefix: st0.prefix };
  let cur = base; let moves = 0; const log: string[] = [];
  for (let round = 0; round < 8; round++) {
    let improved = false;
    for (let ri = 0; ri < st.rules.length; ri++) {
      const r = st.rules[ri]!;
      const head = (r as any).h ?? '', tail = (r as any).t ?? '';
      let bestC = cur, bestH = head, bestT = tail;
      for (let a = 0; a <= MAXK; a++) for (let b = 0; b + a <= MAXK; b++) {
        if (a === 0 && b === 0) continue;
        if (r.v.length - a - b < 1) continue;
        const nh = head + r.v.slice(0, a); const nt = r.v.slice(r.v.length - b) + tail;
        if (nh.length > 12 || nt.length > 12) continue;
        (r as any).h = nh; (r as any).t = nt;
        const t = countTokens(render(st), enc);
        if (t < bestC) { bestC = t; bestH = nh; bestT = nt; }
        (r as any).h = head; (r as any).t = tail;
      }
      if (bestC < cur) { (r as any).h = bestH; (r as any).t = bestT; cur = bestC; improved = true; moves++; log.push(`${r.g}+${JSON.stringify(bestH)}/${JSON.stringify(bestT)}`); }
    }
    if (!improved) break;
  }
  const wire = render(st);
  let ok = false; try { ok = chironDecode(m.slice(m.indexOf(CHIRON_START))) === chironDecode(wire.slice(wire.indexOf(CHIRON_START))); } catch { ok = false; }
  console.log(`${p.split('/').pop()!.padEnd(16)} base ${base} -> ${cur} Δ ${cur - base} (moves ${moves}, exact ${ok})`);
  if (log.length) console.log(`   ${log.slice(0, 14).join(' ')}`);
}
