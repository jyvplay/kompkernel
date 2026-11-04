/**
 * THE SUFFIX-FAMILY RELATION — the vertical version of X74's horizontal entailment,
 * and the one PROSPHYSIS cannot see because it is not inside a single line.
 *
 * Measured wall this attacks: ls-l-real is ONE LANE with density 0.90; the relation
 * PROSPHYSIS exploits is absent from 8 of the 9 lanes swept in t41. The reason is not
 * that listings lack redundancy — it is that the redundancy is VERTICAL: a row's
 * field repeats the PREVIOUS row's field with an affix, or the whole family shares one
 * head. t42 measured the general form (arbitrary field position) and it refills the
 * frontier at +12..+55 even after the heads are cut, because the frontier already
 * predicts same-column cells from the row above (APOGRAPHE/METRON do exactly that).
 *
 * So this test isolates the remaining question: does a HEAD SHARED BY A WHOLE COLUMN
 * (not per pair) survive the frontier? The wire writes the shared head ONCE, as a
 * column-level declaration, and each row carries only its tail — which is strictly
 * less work for the reader than per-pair front coding and is the shape a human
 * abbreviates by hand.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const MARK = '\u00a7';
const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json', 'utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));
const MIN_COVER = Number(process.env.MIN_COVER ?? 0.7);
const MIN_HEAD = Number(process.env.MIN_HEAD ?? 4);
const KEY = `X74 family. Body first. The second line lists, per arrow-free group marker ${MARK}j, the head that every field ${MARK}jT on a later line completes: print the head then T. Print only.`;

function families(text: string): { wire: string; heads: string[]; coveredRows: number; saved: number } {
  const lines = text.split('\n');
  // a "field" is a whitespace-delimited run; a column is a field index that exists on
  // most lines. For each column, the LCP of its values is the family head.
  const split = lines.map((l) => (l.trim() === '' ? null : l.trim().split(/\s+/)));
  const width = Math.max(...split.map((r) => (r ? r.length : 0)));
  const heads: Array<{ col: number; head: string; rows: number[] }> = [];
  for (let c = 0; c < width; c++) {
    const vals = split.map((r, i) => (r && r.length > c ? r[c] : null));
    const present = vals.filter((v) => v !== null) as string[];
    if (present.length < 3) continue;
    // modal head: the candidate is every prefix (>= MIN_HEAD) of every value; keep the
    // one with the largest saved total subject to MIN_COVER coverage.
    let head = '';
    let bestScore = 0;
    const seen = new Set<string>();
    for (const v of present) {
      for (let n = MIN_HEAD; n <= v.length; n++) {
        const cand = v.slice(0, n);
        if (seen.has(cand)) continue;
        seen.add(cand);
        if (!/[\w./@:-]$/.test(cand)) continue;
        const hits = present.filter((x) => x.startsWith(cand)).length;
        const cover = hits / present.length;
        if (cover < MIN_COVER) continue;
        const score = cand.length * hits;
        if (score > bestScore) { bestScore = score; head = cand; }
      }
    }
    if (!head) continue;
    const rows = split.map((r, i) => (r && r.length > c && r[c].startsWith(head) ? i : -1)).filter((i) => i >= 0);
    heads.push({ col: c, head, rows });
  }
  let saved = 0;
  const out = split.map((r) => (r ? [...r] : null));
  const indents = lines.map((l) => /^\s*/.exec(l)![0]);
  for (const h of heads) for (const i of h.rows) { saved += h.head.length; out[i]![h.col] = `${MARK}${h.col}${out[i]![h.col].slice(h.head.length)}`; }
  const decl = heads.map((h) => `${MARK}${h.col}=${h.head}`).join(' ');
  return { wire: (decl ? decl + '\n' : '') + out.map((r, i) => (r ? indents[i] + r.join(' ') : lines[i])).join('\n'), heads: heads.map((h) => h.head), coveredRows: heads.reduce((a, h) => a + h.rows.length, 0), saved };
}

for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const base = F.get(p)!;
  const f = families(t);
  const plain = T(`${KEY}\n${f.wire}`, enc);
  const viaF = T(`${KEY}\n${tagstackFrontier(f.wire, enc).message}`, enc);
  console.log(`${p.split('/').pop()!.padEnd(18)} heads ${String(f.heads.length).padStart(2)} covered ${String(f.coveredRows).padStart(4)} savedChars ${String(f.saved).padStart(5)} key ${String(T(KEY, enc)).padStart(3)} | plain ${String(plain).padStart(5)} F ${String(viaF).padStart(5)} vs ${String(base).padStart(5)} | dF ${viaF - base}`);
}
